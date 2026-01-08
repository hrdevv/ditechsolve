import { WooCommerceCredentials, WooCommerceSystemStatus, ApiError } from "./types";

const CREDENTIALS_KEY = "ditech_wc_credentials";

export class WooCommerceClient {
  private credentials: WooCommerceCredentials | null = null;
  private connected: boolean = false;

  constructor() {
    this.loadCredentials();
  }

  private loadCredentials(): void {
    try {
      const stored = localStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        this.credentials = JSON.parse(stored);
      }
    } catch {
      this.credentials = null;
    }
  }

  saveCredentials(credentials: WooCommerceCredentials): void {
    this.credentials = credentials;
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  clearCredentials(): void {
    this.credentials = null;
    this.connected = false;
    localStorage.removeItem(CREDENTIALS_KEY);
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
    const base = this.credentials.siteUrl.replace(/\/$/, "");
    return apiPath === "wc" 
      ? `${base}/wp-json/wc/v3`
      : `${base}/wp-json/wp/v2`;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    apiPath: "wc" | "wp" = "wc"
  ): Promise<T> {
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

        throw new Error(errorData.message || `Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Unable to connect to the WordPress site. This may be a CORS issue."
        );
      }
      throw error;
    }
  }

  async testConnection(): Promise<WooCommerceSystemStatus> {
    const status = await this.request<WooCommerceSystemStatus>("/system_status");
    this.connected = true;
    return status;
  }

  async uploadMedia(file: File, title?: string): Promise<number> {
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
