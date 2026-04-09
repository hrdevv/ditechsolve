import { WooCommerceCredentials, WooCommerceSystemStatus, ApiError } from "./types";
import { validateSiteUrl, validateCredentials } from "./urlValidation";
import { encryptCredentials, decryptCredentials, isEncryptionSupported } from "./credentialEncryption";

const CREDENTIALS_KEY = "ditech_wc_credentials_v2";
const LEGACY_CREDENTIALS_KEY = "ditech_wc_credentials";

/**
 * Sanitizes error messages for production to prevent information disclosure.
 * In development, returns the full error for debugging.
 */
function sanitizeErrorMessage(error: Error, context: string = "request"): string {
  // In development, show full error details for debugging
  if (import.meta.env.DEV) {
    return error.message;
  }
  
  // In production, return generic messages to prevent reconnaissance
  const message = error.message.toLowerCase();
  
  if (message.includes("cors") || message.includes("fetch") || message.includes("network")) {
    return "Connection failed. Please verify your site URL and check that CORS is properly configured.";
  }
  
  if (message.includes("401") || message.includes("unauthorized")) {
    return "Authentication failed. Please check your API credentials.";
  }
  
  if (message.includes("403") || message.includes("forbidden")) {
    return "Access denied. Please check your API permissions.";
  }
  
  if (message.includes("404") || message.includes("not found")) {
    return "Resource not found. Please verify the endpoint exists.";
  }
  
  if (message.includes("500") || message.includes("server error")) {
    return "Server error occurred. Please try again later.";
  }
  
  // Generic fallback for other errors
  return `${context === "connection" ? "Connection" : "Request"} failed. Please check your configuration and try again.`;
}

export class WooCommerceClient {
  private credentials: WooCommerceCredentials | null = null;
  private connected: boolean = false;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Don't load credentials in constructor - do it async
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadCredentials();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize WooCommerce client:', error);
      this.initialized = true;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async loadCredentials(): Promise<void> {
    try {
      // Try to load encrypted credentials first
      const encrypted = localStorage.getItem(CREDENTIALS_KEY);
      if (encrypted && isEncryptionSupported()) {
        const decrypted = await decryptCredentials(encrypted);
        if (decrypted) {
          this.credentials = decrypted;
          return;
        }
      }

      // Check for legacy unencrypted credentials and migrate them
      const legacy = localStorage.getItem(LEGACY_CREDENTIALS_KEY);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          this.credentials = parsed;
          
          // Migrate to encrypted storage
          if (isEncryptionSupported()) {
            await this.saveCredentials(parsed);
            // Remove legacy storage
            localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
          }
        } catch {
          // Invalid legacy data
          localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
        }
      }
    } catch {
      this.credentials = null;
    }
  }

  async saveCredentials(credentials: WooCommerceCredentials): Promise<void> {
    // Validate URL before saving
    const urlValidation = validateSiteUrl(credentials.siteUrl);
    if (!urlValidation.isValid) {
      throw new Error(urlValidation.error || "Invalid site URL");
    }

    // Validate credentials format
    const credValidation = validateCredentials(credentials.consumerKey, credentials.consumerSecret);
    if (!credValidation.isValid) {
      throw new Error(credValidation.error || "Invalid credentials");
    }

    // Use sanitized URL
    const sanitizedCredentials: WooCommerceCredentials = {
      ...credentials,
      siteUrl: urlValidation.sanitizedUrl || credentials.siteUrl,
    };

    this.credentials = sanitizedCredentials;

    // Encrypt and store — refuse to save if encryption is unavailable
    if (!isEncryptionSupported()) {
      throw new Error("Secure storage is not available in this browser. Please use a modern browser with Web Crypto API support.");
    }

    try {
      const encrypted = await encryptCredentials(sanitizedCredentials);
      localStorage.setItem(CREDENTIALS_KEY, encrypted);
      // Remove any legacy unencrypted storage
      localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
    } catch (error) {
      console.error('Failed to encrypt credentials:', error);
      throw new Error("Failed to securely save credentials");
    }
  }

  clearCredentials(): void {
    this.credentials = null;
    this.connected = false;
    localStorage.removeItem(CREDENTIALS_KEY);
    localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
  }

  getCredentials(): WooCommerceCredentials | null {
    return this.credentials;
  }

  isConnected(): boolean {
    return this.connected;
  }

  setConnected(status: boolean): void {
    this.connected = status;
  }

  private getAuthString(): string {
    if (!this.credentials) {
      throw new Error("No credentials configured");
    }
    return btoa(`${this.credentials.consumerKey}:${this.credentials.consumerSecret}`);
  }

  private getBaseUrl(apiPath: "wc" | "wp" = "wc"): string {
    if (!this.credentials) {
      throw new Error("No credentials configured");
    }
    
    // Re-validate URL on each request (defense in depth)
    const validation = validateSiteUrl(this.credentials.siteUrl);
    if (!validation.isValid) {
      throw new Error(`Invalid site URL: ${validation.error}`);
    }
    
    const base = validation.sanitizedUrl || this.credentials.siteUrl.replace(/\/$/, "");
    return apiPath === "wc" 
      ? `${base}/wp-json/wc/v3`
      : `${base}/wp-json/wp/v2`;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    apiPath: "wc" | "wp" = "wc"
  ): Promise<T> {
    await this.ensureInitialized();
    
    if (!this.credentials) {
      throw new Error("No credentials configured");
    }

    const url = `${this.getBaseUrl(apiPath)}${endpoint}`;
    
    const headers: HeadersInit = {
      Authorization: `Basic ${this.getAuthString()}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          code: "unknown_error",
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));

        const rawError = new Error(errorData.message || `Request failed: ${response.status}`);
        throw new Error(sanitizeErrorMessage(rawError, "request"));
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        // Log detailed error in dev mode for debugging
        if (import.meta.env.DEV) {
          console.error("[WooCommerce] Request error:", error.message);
        }
        throw new Error(sanitizeErrorMessage(error, "connection"));
      }
      throw new Error("An unexpected error occurred. Please try again.");
    }
  }

  async testConnection(): Promise<WooCommerceSystemStatus> {
    const status = await this.request<WooCommerceSystemStatus>("/system_status");
    this.connected = true;
    return status;
  }

  async uploadMedia(file: File, title?: string): Promise<number> {
    await this.ensureInitialized();
    
    if (!this.credentials) {
      throw new Error("No credentials configured");
    }

    const formData = new FormData();
    formData.append("file", file);
    if (title) {
      formData.append("title", title);
    }

    const url = `${this.getBaseUrl("wp")}/media`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.getAuthString()}`,
      },
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

export const wooClient = new WooCommerceClient();
