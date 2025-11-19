/**
 * WordPress/WooCommerce REST API Client
 * 
 * This module provides a comprehensive interface for interacting with WordPress
 * and WooCommerce REST APIs using OAuth 1.0a authentication.
 * 
 * FUNDAMENTAL CONCEPTS:
 * 
 * 1. AUTHENTICATION:
 *    - WooCommerce uses OAuth 1.0a for secure API access
 *    - Consumer Key (ck_xxx) and Consumer Secret (cs_xxx) are required
 *    - These credentials are generated in WP Admin → WooCommerce → Settings → Advanced → REST API
 * 
 * 2. API STRUCTURE:
 *    - Base URL: https://yoursite.com/wp-json/
 *    - WooCommerce v3: /wp-json/wc/v3/products
 *    - WordPress Core: /wp-json/wp/v2/media
 * 
 * 3. OAUTH SIGNATURE:
 *    - All requests must be signed with OAuth parameters
 *    - Signature includes: consumer_key, timestamp, nonce, signature_method
 *    - We use Basic Auth over HTTPS for simplicity (recommended by WooCommerce)
 */

interface WordPressConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface Product {
  id?: number;
  name: string;
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  status?: 'draft' | 'pending' | 'private' | 'publish';
  featured?: boolean;
  catalog_visibility?: 'visible' | 'catalog' | 'search' | 'hidden';
  description?: string;
  short_description?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  categories?: Array<{ id: number; name?: string }>;
  images?: Array<{ id?: number; src?: string; name?: string; alt?: string }>;
}

interface Category {
  id?: number;
  name: string;
  slug?: string;
  parent?: number;
  description?: string;
  display?: 'default' | 'products' | 'subcategories' | 'both';
  image?: { id?: number; src?: string };
  count?: number;
}

interface MediaUploadResponse {
  id: number;
  source_url: string;
  title: { rendered: string };
  alt_text: string;
  media_type: string;
  mime_type: string;
}

class WordPressAPI {
  private config: WordPressConfig | null = null;

  /**
   * Initialize the API client with WordPress credentials
   * 
   * @param config - WordPress site URL and API credentials
   */
  configure(config: WordPressConfig) {
    // Validate configuration
    if (!config.siteUrl || !config.consumerKey || !config.consumerSecret) {
      throw new Error('Invalid WordPress configuration: siteUrl, consumerKey, and consumerSecret are required');
    }

    // Ensure URL doesn't have trailing slash
    config.siteUrl = config.siteUrl.replace(/\/$/, '');

    this.config = config;
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): WordPressConfig | null {
    return this.config;
  }

  /**
   * Generate Basic Authentication header
   * WooCommerce recommends using Basic Auth over HTTPS for simplicity
   * 
   * Format: Authorization: Basic base64(consumer_key:consumer_secret)
   */
  private getAuthHeaders(): HeadersInit {
    if (!this.config) {
      throw new Error('WordPress API not configured. Call configure() first.');
    }

    const credentials = `${this.config.consumerKey}:${this.config.consumerSecret}`;
    const encodedCredentials = btoa(credentials);

    return {
      'Authorization': `Basic ${encodedCredentials}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make authenticated request to WordPress/WooCommerce API
   * 
   * @param endpoint - API endpoint (e.g., '/wc/v3/products')
   * @param options - Fetch options
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.config) {
      throw new Error('WordPress API not configured');
    }

    const url = `${this.config.siteUrl}/wp-json${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // If not JSON, use status text
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Test connection to WordPress/WooCommerce
   * 
   * @returns Promise that resolves if connection is successful
   */
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      // Test WooCommerce API
      const response = await this.request<{ version: string }>('/wc/v3/system_status');
      
      return {
        success: true,
        message: 'Successfully connected to WooCommerce',
        version: response.version,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // PRODUCTS API
  // ============================================

  /**
   * Retrieve all products with pagination and filtering
   * 
   * @param params - Query parameters (per_page, page, search, status, etc.)
   */
  async getProducts(params: {
    per_page?: number;
    page?: number;
    search?: string;
    status?: string;
    orderby?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/wc/v3/products?${queryParams.toString()}`;
    return this.request<Product[]>(endpoint);
  }

  /**
   * Get a single product by ID
   */
  async getProduct(id: number): Promise<Product> {
    return this.request<Product>(`/wc/v3/products/${id}`);
  }

  /**
   * Create a new product
   * 
   * @param product - Product data (name is required)
   */
  async createProduct(product: Product): Promise<Product> {
    return this.request<Product>('/wc/v3/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/wc/v3/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number, force: boolean = false): Promise<{ deleted: boolean }> {
    return this.request(`/wc/v3/products/${id}?force=${force}`, {
      method: 'DELETE',
    });
  }

  /**
   * Batch create/update/delete products
   * Useful for bulk operations
   */
  async batchProducts(batch: {
    create?: Product[];
    update?: Array<{ id: number } & Partial<Product>>;
    delete?: number[];
  }): Promise<{ create: Product[]; update: Product[]; delete: Product[] }> {
    return this.request('/wc/v3/products/batch', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  }

  // ============================================
  // CATEGORIES API
  // ============================================

  /**
   * Get all product categories
   */
  async getCategories(params: {
    per_page?: number;
    page?: number;
    search?: string;
    orderby?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/wc/v3/products/categories?${queryParams.toString()}`;
    return this.request<Category[]>(endpoint);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: number): Promise<Category> {
    return this.request<Category>(`/wc/v3/products/categories/${id}`);
  }

  /**
   * Create a new category
   */
  async createCategory(category: Category): Promise<Category> {
    return this.request<Category>('/wc/v3/products/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  /**
   * Update a category
   */
  async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
    return this.request<Category>(`/wc/v3/products/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number, force: boolean = false): Promise<{ deleted: boolean }> {
    return this.request(`/wc/v3/products/categories/${id}?force=${force}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // MEDIA API (WordPress Core)
  // ============================================

  /**
   * Upload an image to WordPress Media Library
   * 
   * IMPORTANT: This uses WordPress Core API, not WooCommerce
   * Endpoint: /wp/v2/media
   * 
   * @param file - Image file to upload
   * @param filename - Optional custom filename
   */
  async uploadMedia(file: File, filename?: string): Promise<MediaUploadResponse> {
    if (!this.config) {
      throw new Error('WordPress API not configured');
    }

    const url = `${this.config.siteUrl}/wp-json/wp/v2/media`;
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file, filename || file.name);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        // Don't set Content-Type - browser will set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Media upload failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Upload multiple images in parallel
   * Returns array of media IDs
   */
  async uploadMultipleMedia(files: File[]): Promise<MediaUploadResponse[]> {
    const uploadPromises = files.map(file => this.uploadMedia(file));
    return Promise.all(uploadPromises);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Create a product from an image file
   * This is a convenience method that:
   * 1. Uploads the image to Media Library
   * 2. Creates a product with the image as featured image
   * 
   * @param imageFile - Image file
   * @param productData - Product data (name, price, etc.)
   */
  async createProductFromImage(
    imageFile: File,
    productData: Omit<Product, 'images'>
  ): Promise<{ product: Product; mediaId: number }> {
    // Upload image first
    const media = await this.uploadMedia(imageFile);

    // Create product with uploaded image
    const product = await this.createProduct({
      ...productData,
      images: [{ id: media.id }],
    });

    return { product, mediaId: media.id };
  }

  /**
   * Bulk create products from images
   * This handles the complete workflow:
   * 1. Upload all images
   * 2. Create products with images
   * 
   * Returns results with success/failure status for each product
   */
  async bulkCreateProductsFromImages(
    items: Array<{ file: File; productData: Omit<Product, 'images'> }>
  ): Promise<Array<{ success: boolean; product?: Product; error?: string }>> {
    const results = [];

    for (const item of items) {
      try {
        const { product } = await this.createProductFromImage(item.file, item.productData);
        results.push({ success: true, product });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get or create category by name
   * Useful for ensuring a category exists before assigning to product
   */
  async getOrCreateCategory(name: string): Promise<Category> {
    // Search for existing category
    const categories = await this.getCategories({ search: name, per_page: 1 });
    
    if (categories.length > 0 && categories[0].name === name) {
      return categories[0];
    }

    // Create if doesn't exist
    return this.createCategory({ name });
  }
}

// Export singleton instance
export const wordpressAPI = new WordPressAPI();

// Export types
export type { WordPressConfig, Product, Category, MediaUploadResponse };
