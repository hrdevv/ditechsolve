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
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<WooCommerceCredentials | null>(
    wooClient.getCredentials()
  );
  const [systemStatus, setSystemStatus] = useState<WooCommerceSystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    wooClient.saveCredentials(newCredentials);
    setCredentials(newCredentials);

    setIsLoading(true);
    setError(null);

    try {
      const status = await wooClient.testConnection();
      setSystemStatus(status);
      setIsConnected(true);
      activityLogger.log("connection_established", newCredentials.siteUrl, {
        details: `WooCommerce ${status.environment.version}`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      activityLogger.log("connection_failed", newCredentials.siteUrl, {
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

  // Try to reconnect on mount if credentials exist
  useEffect(() => {
    if (credentials && !isConnected && !isLoading) {
      testConnection();
    }
  }, []);

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
