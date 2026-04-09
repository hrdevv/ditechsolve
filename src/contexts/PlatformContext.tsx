import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { platformClient } from "@/lib/platform/client";
import { PlatformCredentials, PlatformConnectionStatus } from "@/lib/platform/types";
import { activityLogger } from "@/lib/activityLogger";

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
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentials] = useState<PlatformCredentials | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<PlatformConnectionStatus | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await platformClient.ensureInitialized();
      setCredentials(platformClient.getCredentials());
      setIsLoading(false);
    };
    init();
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!credentials) return false;
    setIsLoading(true);
    setError(null);

    try {
      const result = await platformClient.testConnection();
      setSystemInfo(result);

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
          "WordPress": result.environment.wp_version || "",
          "WooCommerce": result.environment.version || "",
          "Site": result.environment.home_url || "",
        };
      }

      setConnectionStatus(status);
      setIsConnected(true);
      activityLogger.log("connection_established", credentials.name, {
        details: `${credentials.platformType}${status.version ? ` v${status.version}` : ""}`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      activityLogger.log("connection_failed", credentials.name, {
        details: message,
        status: "error",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [credentials]);

  const connect = async (newCredentials: PlatformCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await platformClient.saveCredentials(newCredentials);
      setCredentials(platformClient.getCredentials());

      const result = await platformClient.testConnection();
      setSystemInfo(result);

      const status: PlatformConnectionStatus = {
        connected: true,
        platformName: newCredentials.name,
        platformType: newCredentials.platformType,
        version: result?.environment?.version,
      };
      setConnectionStatus(status);
      setIsConnected(true);

      const sanitizedUrl = new URL(newCredentials.baseUrl).hostname;
      activityLogger.log("connection_established", sanitizedUrl, {
        details: `${newCredentials.platformType}${status.version ? ` v${status.version}` : ""}`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      activityLogger.log("connection_failed", "[site]", {
        details: message,
        status: "error",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    platformClient.clearCredentials();
    setCredentials(null);
    setConnectionStatus(null);
    setSystemInfo(null);
    setIsConnected(false);
    setError(null);
  };

  useEffect(() => {
    if (credentials && !isConnected && !isLoading) {
      testConnection();
    }
  }, [credentials, isConnected, isLoading, testConnection]);

  return (
    <PlatformContext.Provider
      value={{ isConnected, isLoading, credentials, connectionStatus, systemInfo, error, connect, disconnect, testConnection }}
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
