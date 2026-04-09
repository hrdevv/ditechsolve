/**
 * Platform-agnostic types for universal API connectivity.
 * Supports WooCommerce, Shopify, custom REST APIs, and more.
 */

export type AuthMethod = "none" | "basic" | "bearer" | "api_key" | "woocommerce";

export interface PlatformCredentials {
  /** Display name for this connection */
  name: string;
  /** Base URL of the API */
  baseUrl: string;
  /** Authentication method */
  authMethod: AuthMethod;
  /** For basic auth: username */
  username?: string;
  /** For basic auth: password; for bearer: token; for api_key: key value */
  secret?: string;
  /** For api_key: the header name (e.g., "X-API-Key") */
  apiKeyHeader?: string;
  /** Optional custom headers as key-value pairs */
  customHeaders?: Record<string, string>;
  /** Optional API base path (e.g., "/wp-json/wc/v3") */
  basePath?: string;
  /** Platform type for adapter selection */
  platformType: PlatformType;
}

export type PlatformType = "woocommerce" | "generic_rest";

export interface PlatformConnectionStatus {
  connected: boolean;
  platformName: string;
  platformType: PlatformType;
  version?: string;
  details?: Record<string, string>;
}

export interface PlatformSystemInfo {
  name: string;
  version?: string;
  url?: string;
  details?: Record<string, string>;
}

/** Converts legacy WooCommerce credentials to the new format */
export function fromWooCommerceCredentials(wc: {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}): PlatformCredentials {
  return {
    name: "WooCommerce",
    baseUrl: wc.siteUrl,
    authMethod: "woocommerce",
    username: wc.consumerKey,
    secret: wc.consumerSecret,
    basePath: "/wp-json/wc/v3",
    platformType: "woocommerce",
  };
}
