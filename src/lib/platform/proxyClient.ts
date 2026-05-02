/**
 * Proxy-based API client that routes all platform API calls through the
 * server-side edge function, keeping credentials off the client.
 */
import { supabase } from "@/integrations/supabase/client";

class ProxyClient {
  async request<T>(endpoint: string, options: { method?: string; body?: string } = {}): Promise<T> {
    const { data, error } = await supabase.functions.invoke("platform-proxy", {
      body: {
        action: "proxy",
        endpoint,
        method: options.method || "GET",
        request_body: options.body ? JSON.parse(options.body) : undefined,
      },
    });

    if (error) {
      throw new Error(error.message || "Proxy request failed");
    }

    return data as T;
  }
}

export const proxyClient = new ProxyClient();
