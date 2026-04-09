/**
 * Universal REST API client.
 * Supports multiple auth methods and configurable base paths.
 */

import { PlatformCredentials, AuthMethod } from "./types";
import { validateSiteUrl } from "@/lib/woocommerce/urlValidation";
import { encryptCredentials, decryptCredentials, isEncryptionSupported } from "@/lib/woocommerce/credentialEncryption";

const CREDENTIALS_KEY = "ditech_platform_credentials_v3";

function sanitizeErrorMessage(error: Error, context: string = "request"): string {
  if (import.meta.env.DEV) return error.message;

  const msg = error.message.toLowerCase();
  if (msg.includes("cors") || msg.includes("fetch") || msg.includes("network"))
    return "Connection failed. Please verify your URL and check that CORS is properly configured.";
  if (msg.includes("401") || msg.includes("unauthorized"))
    return "Authentication failed. Please check your credentials.";
  if (msg.includes("403") || msg.includes("forbidden"))
    return "Access denied. Please check your API permissions.";
  if (msg.includes("404") || msg.includes("not found"))
    return "Resource not found. Please verify the endpoint exists.";
  if (msg.includes("500") || msg.includes("server error"))
    return "Server error occurred. Please try again later.";
  return `${context === "connection" ? "Connection" : "Request"} failed. Please check your configuration and try again.`;
}

function buildAuthHeaders(creds: PlatformCredentials): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (creds.authMethod) {
    case "basic":
      headers["Authorization"] = `Basic ${btoa(`${creds.username || ""}:${creds.secret || ""}`)}`;
      break;
    case "bearer":
      headers["Authorization"] = `Bearer ${creds.secret || ""}`;
      break;
    case "api_key":
      if (creds.apiKeyHeader && creds.secret) {
        headers[creds.apiKeyHeader] = creds.secret;
      }
      break;
    case "woocommerce":
      headers["Authorization"] = `Basic ${btoa(`${creds.username || ""}:${creds.secret || ""}`)}`;
      break;
    case "none":
    default:
      break;
  }

  // Merge custom headers
  if (creds.customHeaders) {
    Object.entries(creds.customHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  return headers;
}

export class PlatformClient {
  private credentials: PlatformCredentials | null = null;
  private connected: boolean = false;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.loadCredentials();
    } catch (error) {
      console.error("Failed to initialize platform client:", error);
    }
    this.initialized = true;
  }

  async ensureInitialized(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }

  private async loadCredentials(): Promise<void> {
    try {
      // Load new format
      const encrypted = localStorage.getItem(CREDENTIALS_KEY);
      if (encrypted && isEncryptionSupported()) {
        const decrypted = await decryptCredentials(encrypted);
        if (decrypted) {
          // decryptCredentials returns WooCommerceCredentials but we store PlatformCredentials
          this.credentials = decrypted as unknown as PlatformCredentials;
          return;
        }
      }

      // Try legacy WooCommerce formats and migrate
      const legacyV2 = localStorage.getItem("ditech_wc_credentials_v2");
      const legacyV1 = localStorage.getItem("ditech_wc_credentials");
      const legacy = legacyV2 || legacyV1;
      if (legacy) {
        try {
          let parsed: any;
          if (legacyV2 && isEncryptionSupported()) {
            parsed = await decryptCredentials(legacyV2);
          } else if (legacyV1) {
            parsed = JSON.parse(legacyV1);
          }
          if (parsed && parsed.siteUrl) {
            // Migrate legacy WooCommerce credentials
            const migrated: PlatformCredentials = {
              name: "WooCommerce",
              baseUrl: parsed.siteUrl,
              authMethod: "woocommerce",
              username: parsed.consumerKey,
              secret: parsed.consumerSecret,
              basePath: "/wp-json/wc/v3",
              platformType: "woocommerce",
            };
            this.credentials = migrated;
            await this.saveCredentials(migrated);
            localStorage.removeItem("ditech_wc_credentials_v2");
            localStorage.removeItem("ditech_wc_credentials");
          }
        } catch {
          localStorage.removeItem("ditech_wc_credentials");
        }
      }
    } catch {
      this.credentials = null;
    }
  }

  async saveCredentials(credentials: PlatformCredentials): Promise<void> {
    const urlValidation = validateSiteUrl(credentials.baseUrl);
    if (!urlValidation.isValid) {
      throw new Error(urlValidation.error || "Invalid site URL");
    }

    const sanitized: PlatformCredentials = {
      ...credentials,
      baseUrl: urlValidation.sanitizedUrl || credentials.baseUrl,
    };

    this.credentials = sanitized;

    if (!isEncryptionSupported()) {
      throw new Error("Secure storage is not available in this browser. Please use a modern browser with Web Crypto API support.");
    }

    try {
      // We serialize as JSON and encrypt (reusing the encrypt function which accepts any serializable object)
      const encrypted = await encryptCredentials(sanitized as any);
      localStorage.setItem(CREDENTIALS_KEY, encrypted);
      // Clean up legacy keys
      localStorage.removeItem("ditech_wc_credentials_v2");
      localStorage.removeItem("ditech_wc_credentials");
    } catch {
      throw new Error("Failed to securely save credentials");
    }
  }

  clearCredentials(): void {
    this.credentials = null;
    this.connected = false;
    localStorage.removeItem(CREDENTIALS_KEY);
    localStorage.removeItem("ditech_wc_credentials_v2");
    localStorage.removeItem("ditech_wc_credentials");
  }

  getCredentials(): PlatformCredentials | null {
    return this.credentials;
  }

  isConnected(): boolean {
    return this.connected;
  }

  setConnected(status: boolean): void {
    this.connected = status;
  }

  private getFullUrl(endpoint: string): string {
    if (!this.credentials) throw new Error("No credentials configured");

    const validation = validateSiteUrl(this.credentials.baseUrl);
    if (!validation.isValid) throw new Error(`Invalid site URL: ${validation.error}`);

    const base = (validation.sanitizedUrl || this.credentials.baseUrl).replace(/\/$/, "");
    const path = this.credentials.basePath ? this.credentials.basePath.replace(/\/$/, "") : "";
    return `${base}${path}${endpoint}`;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureInitialized();
    if (!this.credentials) throw new Error("No credentials configured");

    const url = this.getFullUrl(endpoint);
    const authHeaders = buildAuthHeaders(this.credentials);

    const headers: HeadersInit = {
      ...authHeaders,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          code: "unknown_error",
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        const rawError = new Error(errorData.message || `Request failed: ${response.status}`);
        throw new Error(sanitizeErrorMessage(rawError, "request"));
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (import.meta.env.DEV) console.error("[Platform] Request error:", error.message);
        throw new Error(sanitizeErrorMessage(error, "connection"));
      }
      throw new Error("An unexpected error occurred. Please try again.");
    }
  }

  /** Test connection by hitting a test endpoint */
  async testConnection(): Promise<any> {
    if (!this.credentials) throw new Error("No credentials configured");

    let result: any;

    if (this.credentials.platformType === "woocommerce") {
      result = await this.request("/system_status");
    } else {
      // Generic REST: try a simple GET to the base path
      result = await this.request("");
    }

    this.connected = true;
    return result;
  }

  /** Upload media (WordPress-specific, but available for WooCommerce adapter) */
  async uploadMedia(file: File, title?: string): Promise<number> {
    await this.ensureInitialized();
    if (!this.credentials) throw new Error("No credentials configured");

    const validation = validateSiteUrl(this.credentials.baseUrl);
    if (!validation.isValid) throw new Error(`Invalid site URL: ${validation.error}`);

    const base = (validation.sanitizedUrl || this.credentials.baseUrl).replace(/\/$/, "");
    const url = `${base}/wp-json/wp/v2/media`;

    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    const authHeaders = buildAuthHeaders(this.credentials);

    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(errorData.message);
    }

    const media = await response.json();
    return media.id;
  }
}

export const platformClient = new PlatformClient();
