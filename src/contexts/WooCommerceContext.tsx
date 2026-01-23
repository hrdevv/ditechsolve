import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { wooClient } from "@/lib/woocommerce/client";
import { WooCommerceCredentials, WooCommerceSystemStatus } from "@/lib/woocommerce/types";
import { activityLogger } from "@/lib/activityLogger";

interface WooCommerceContextValue {
  isConnected: boolean;
  isLoading: boolean;
  credentials: WooCommerceCredentials | null;
  systemStatus: WooCommerceSystemStatus | null;
  error: string | null;
  connect: (credentials: WooCommerceCredentials) => Promise<boolean>;
  disconnect: () => void;
  testConnection: () => Promise<boolean>;
}

const WooCommerceContext = createContext<WooCommerceContextValue | null>(null);

export const WooCommerceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start loading until initialized
  const [credentials, setCredentials] = useState<WooCommerceCredentials | null>(null);
  const [systemStatus, setSystemStatus] = useState<WooCommerceSystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize credentials asynchronously
  useEffect(() => {
    const initCredentials = async () => {
      await wooClient.ensureInitialized();
      setCredentials(wooClient.getCredentials());
      setIsLoading(false);
    };
    initCredentials();
  }, []);
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!credentials) return false;

    setIsLoading(true);
    setError(null);

    try {
      const status = await wooClient.testConnection();
      setSystemStatus(status);
      setIsConnected(true);
      activityLogger.log("connection_established", credentials.siteUrl, {
        details: `WooCommerce ${status.environment.version}`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      activityLogger.log("connection_failed", credentials.siteUrl, {
        details: message,
        status: "error",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [credentials]);

  const connect = async (newCredentials: WooCommerceCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // saveCredentials now validates and encrypts
      await wooClient.saveCredentials(newCredentials);
      setCredentials(wooClient.getCredentials());

      const status = await wooClient.testConnection();
      setSystemStatus(status);
      setIsConnected(true);
      // Log with sanitized URL (only domain)
      const sanitizedUrl = new URL(newCredentials.siteUrl).hostname;
      activityLogger.log("connection_established", sanitizedUrl, {
        details: `WooCommerce ${status.environment.version}`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      // Log with sanitized info
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
    wooClient.clearCredentials();
    setCredentials(null);
    setSystemStatus(null);
    setIsConnected(false);
    setError(null);
  };

  // Try to reconnect on mount if credentials exist (after initialization)
  useEffect(() => {
    if (credentials && !isConnected && !isLoading) {
      testConnection();
    }
  }, [credentials, isConnected, isLoading, testConnection]);

  return (
    <WooCommerceContext.Provider
      value={{
        isConnected,
        isLoading,
        credentials,
        systemStatus,
        error,
        connect,
        disconnect,
        testConnection,
      }}
    >
      {children}
    </WooCommerceContext.Provider>
  );
};

export const useWooCommerce = (): WooCommerceContextValue => {
  const context = useContext(WooCommerceContext);
  if (!context) {
    throw new Error("useWooCommerce must be used within a WooCommerceProvider");
  }
  return context;
};
