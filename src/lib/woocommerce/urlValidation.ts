/**
 * URL validation utilities for WooCommerce site configuration
 * Prevents SSRF attacks and connections to malicious endpoints
 */

// Private IP ranges that should be blocked
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,  // Link-local
  /^::1$/,        // IPv6 localhost
  /^fc00:/i,      // IPv6 private
  /^fe80:/i,      // IPv6 link-local
];

// Maximum URL length to prevent DoS
const MAX_URL_LENGTH = 2048;

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Validates a WordPress/WooCommerce site URL
 * - Ensures HTTPS protocol
 * - Blocks private IP ranges (SSRF prevention)
 * - Validates URL format
 * - Enforces length limits
 */
export function validateSiteUrl(url: string): UrlValidationResult {
  // Check for empty or null
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: "URL is required" };
  }

  // Trim and check length
  const trimmedUrl = url.trim();
  if (trimmedUrl.length === 0) {
    return { isValid: false, error: "URL cannot be empty" };
  }
  
  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return { isValid: false, error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }

  // Enforce HTTPS only (security requirement)
  if (parsed.protocol !== 'https:') {
    return { isValid: false, error: "Only HTTPS URLs are allowed for security" };
  }

  // Check for credentials in URL (shouldn't be there)
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "URL must not contain credentials" };
  }

  // Get hostname for validation
  const hostname = parsed.hostname.toLowerCase();

  // Block private IP ranges (SSRF prevention)
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { isValid: false, error: "Private/local network addresses are not allowed" };
    }
  }

  // Block IP addresses entirely (require domain names)
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^\[?([a-f0-9:]+)\]?$/i;
  if (ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname)) {
    return { isValid: false, error: "Direct IP addresses are not allowed. Please use a domain name." };
  }

  // Check for valid hostname characters
  const validHostnamePattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
  if (!validHostnamePattern.test(hostname)) {
    return { isValid: false, error: "Invalid hostname format" };
  }

  // Ensure there's at least one dot (valid domain)
  if (!hostname.includes('.')) {
    return { isValid: false, error: "Please enter a valid domain name" };
  }

  // Sanitize: remove trailing slash and any path beyond root
  const sanitizedUrl = `${parsed.protocol}//${parsed.host}`;

  return { 
    isValid: true, 
    sanitizedUrl 
  };
}

/**
 * Validates WooCommerce API credentials format
 */
export function validateCredentials(consumerKey: string, consumerSecret: string): UrlValidationResult {
  if (!consumerKey || typeof consumerKey !== 'string') {
    return { isValid: false, error: "Consumer Key is required" };
  }
  
  if (!consumerSecret || typeof consumerSecret !== 'string') {
    return { isValid: false, error: "Consumer Secret is required" };
  }

  const trimmedKey = consumerKey.trim();
  const trimmedSecret = consumerSecret.trim();

  // Validate key format (ck_...)
  if (!trimmedKey.startsWith('ck_')) {
    return { isValid: false, error: "Consumer Key should start with 'ck_'" };
  }

  // Validate secret format (cs_...)
  if (!trimmedSecret.startsWith('cs_')) {
    return { isValid: false, error: "Consumer Secret should start with 'cs_'" };
  }

  // Check minimum length
  if (trimmedKey.length < 10 || trimmedSecret.length < 10) {
    return { isValid: false, error: "Invalid credential format" };
  }

  // Check for valid characters (alphanumeric and underscore only)
  const validCredPattern = /^[a-zA-Z0-9_]+$/;
  if (!validCredPattern.test(trimmedKey) || !validCredPattern.test(trimmedSecret)) {
    return { isValid: false, error: "Credentials contain invalid characters" };
  }

  return { isValid: true };
}
