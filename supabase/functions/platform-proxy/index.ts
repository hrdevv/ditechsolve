import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// === Encryption helpers (AES-GCM, key derived per-user via HKDF) ===
const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveUserKey(userId: string): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey(
    "raw",
    enc.encode(supabaseServiceKey),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode(userId),
      info: enc.encode("platform_credentials.v1"),
    },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptSecret(plaintext: string, userId: string): Promise<string> {
  const key = await deriveUserKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)),
  );
  return `v1:${b64encode(iv)}:${b64encode(ct)}`;
}

async function decryptSecret(stored: string, userId: string): Promise<string> {
  if (!stored.startsWith("v1:")) {
    // Legacy plaintext row — return as-is so callers can still parse JSON.
    return stored;
  }
  const [, ivB64, ctB64] = stored.split(":");
  const key = await deriveUserKey(userId);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ctB64),
  );
  return dec.decode(pt);
}

// === SSRF protection: block private/loopback hosts on every redirect hop ===
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return PRIVATE_HOST_PATTERNS.some((p) => p.test(h));
}

async function safeFetch(initialUrl: string, options: RequestInit, maxRedirects = 5): Promise<Response> {
  let currentUrl = initialUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Unsupported URL scheme");
    }
    if (isPrivateHost(parsed.hostname)) {
      throw new Error("Refusing to fetch private/internal address");
    }
    const res = await fetch(currentUrl, { ...options, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      currentUrl = new URL(loc, currentUrl).toString();
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // === CREDENTIAL MANAGEMENT ===
    if (action === "save_credentials") {
      const { name, base_url, platform_type, auth_method, base_path, custom_headers, encrypted_secrets } = body;
      if (!base_url || !encrypted_secrets) {
        return new Response(JSON.stringify({ error: "base_url and encrypted_secrets are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deactivate existing, then insert new
      await supabase
        .from("platform_credentials")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);

      const { data, error } = await supabase
        .from("platform_credentials")
        .insert({
          user_id: user.id,
          name: name || "My API",
          base_url,
          platform_type: platform_type || "generic_rest",
          auth_method: auth_method || "bearer",
          base_path: base_path || null,
          custom_headers: custom_headers || null,
          encrypted_secrets: await encryptSecret(encrypted_secrets, user.id),
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_credentials") {
      const { data, error } = await supabase
        .from("platform_credentials")
        .select("id, name, base_url, platform_type, auth_method, base_path, custom_headers, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ credentials: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_credentials") {
      await supabase
        .from("platform_credentials")
        .delete()
        .eq("user_id", user.id)
        .eq("is_active", true);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === API PROXY ===
    if (action === "proxy") {
      const { endpoint, method, request_body } = body;

      // Get the user's active credentials (with secrets)
      const { data: creds, error: credsError } = await supabase
        .from("platform_credentials")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (credsError || !creds) {
        return new Response(JSON.stringify({ error: "No active connection found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decrypt and parse stored secrets
      let secrets: { username?: string; secret?: string; apiKeyHeader?: string };
      try {
        const decrypted = await decryptSecret(creds.encrypted_secrets, user.id);
        secrets = JSON.parse(decrypted);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid stored credentials" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build auth headers
      const proxyHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };

      switch (creds.auth_method) {
        case "basic":
        case "woocommerce":
          proxyHeaders["Authorization"] = `Basic ${btoa(`${secrets.username || ""}:${secrets.secret || ""}`)}`;
          break;
        case "bearer":
          proxyHeaders["Authorization"] = `Bearer ${secrets.secret || ""}`;
          break;
        case "api_key":
          if (secrets.apiKeyHeader && secrets.secret) {
            proxyHeaders[secrets.apiKeyHeader] = secrets.secret;
          }
          break;
      }

      // Merge custom headers
      if (creds.custom_headers && typeof creds.custom_headers === "object") {
        Object.entries(creds.custom_headers as Record<string, string>).forEach(([k, v]) => {
          proxyHeaders[k] = v;
        });
      }

      // Build URL
      const base = creds.base_url.replace(/\/$/, "");
      const path = creds.base_path ? creds.base_path.replace(/\/$/, "") : "";
      const url = `${base}${path}${endpoint || ""}`;

      // Forward request
      const fetchOptions: RequestInit = {
        method: method || "GET",
        headers: proxyHeaders,
      };

      if (request_body && ["POST", "PUT", "PATCH"].includes((method || "GET").toUpperCase())) {
        fetchOptions.body = JSON.stringify(request_body);
      }

      const apiResponse = await safeFetch(url, fetchOptions);
      const responseData = await apiResponse.text();

      return new Response(responseData, {
        status: apiResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": apiResponse.headers.get("Content-Type") || "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
