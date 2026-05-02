import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformCredentials, PlatformConnectionStatus } from "@/lib/platform/types";
import { activityLogger } from "@/lib/activityLogger";
import { useAuth } from "@/contexts/AuthContext";

interface PlatformContextValue {
  isConnected: boolean;
  isLoading: boolean;
  credentials: PlatformCredentials | null;
  connectionStatus: PlatformConnectionStatus | null;
  systemInfo: any;
  error: string | null;
  connect: (credentials: PlatformCredentials) => Promise<boolean>;
  disconnect: () => void;
  testConnection: () => Promise<boolean>;
  loadServerCredentials: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<PlatformCredentials | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<PlatformConnectionStatus | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const invokeProxy = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("platform-proxy", { body });
    if (error) throw new Error(error.message);
    return data;
  }, []);

  const loadServerCredentials = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const data = await invokeProxy({ action: "get_credentials" });
      if (data?.credentials) {
        const creds: PlatformCredentials = {
          name: data.credentials.name,
          baseUrl: data.credentials.base_url,
          platformType: data.credentials.platform_type,
          authMethod: data.credentials.auth_method,
          basePath: data.credentials.base_path,
          customHeaders: data.credentials.custom_headers as Record<string, string> | undefined,
        };
        setCredentials(creds);
      }
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session, invokeProxy]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!credentials || !session) return false;
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = credentials.platformType === "woocommerce" ? "/system_status" : "";
      const result = await invokeProxy({
        action: "proxy",
        endpoint,
        method: "GET",
      });

      const status: PlatformConnectionStatus = {
        connected: true,
        platformName: credentials.name,
        platformType: credentials.platformType,
        version: result?.environment?.version,
        details: {},
      };

      if (credentials.platformType === "woocommerce" && result?.environment) {
        status.version = result.environment.version;
        status.details = {
          WordPress: result.environment.wp_version || "",
          WooCommerce: result.environment.version || "",
          Site: result.environment.home_url || "",
        };
      }

      setConnectionStatus(status);
      setSystemInfo(result);
      setIsConnected(true);
      activityLogger.log("connection_established", credentials.name, {
        details: `${credentials.platformType}${status.version ? ` v${status.version}` : ""}`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [credentials, session, invokeProxy]);

  const connect = async (newCredentials: PlatformCredentials): Promise<boolean> => {
    if (!session) {
      setError("You must be signed in to save credentials");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Store secrets server-side (username, secret, apiKeyHeader as JSON)
      const secrets = JSON.stringify({
        username: newCredentials.username,
        secret: newCredentials.secret,
        apiKeyHeader: newCredentials.apiKeyHeader,
      });

      await invokeProxy({
        action: "save_credentials",
        name: newCredentials.name,
        base_url: newCredentials.baseUrl,
        platform_type: newCredentials.platformType,
        auth_method: newCredentials.authMethod,
        base_path: newCredentials.basePath,
        custom_headers: newCredentials.customHeaders,
        encrypted_secrets: secrets,
      });

      // Set credentials without secrets for display
      const displayCreds: PlatformCredentials = {
        ...newCredentials,
        username: undefined,
        secret: undefined,
      };
      setCredentials(displayCreds);

      // Test connection through proxy
      const endpoint = newCredentials.platformType === "woocommerce" ? "/system_status" : "";
      const result = await invokeProxy({
        action: "proxy",
        endpoint,
        method: "GET",
      });

      const status: PlatformConnectionStatus = {
        connected: true,
        platformName: newCredentials.name,
        platformType: newCredentials.platformType,
        version: result?.environment?.version,
      };
      setConnectionStatus(status);
      setSystemInfo(result);
      setIsConnected(true);

      activityLogger.log("connection_established", newCredentials.name, {
        details: `${newCredentials.platformType}${status.version ? ` v${status.version}` : ""}`,
      });

      // Clean up any legacy localStorage credentials
      localStorage.removeItem("ditech_platform_credentials_v3");
      localStorage.removeItem("ditech_wc_credentials_v2");
      localStorage.removeItem("ditech_wc_credentials");

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      await invokeProxy({ action: "delete_credentials" });
    } catch {
      // best effort
    }
    setCredentials(null);
    setConnectionStatus(null);
    setSystemInfo(null);
    setIsConnected(false);
    setError(null);
  };

  return (
    <PlatformContext.Provider
      value={{
        isConnected,
        isLoading,
        credentials,
        connectionStatus,
        systemInfo,
        error,
        connect,
        disconnect,
        testConnection,
        loadServerCredentials,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = (): PlatformContextValue => {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used within a PlatformProvider");
  return context;
};

// Backward-compatible alias
export const useWooCommerce = usePlatform;
