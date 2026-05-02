import { proxyClient } from "@/lib/platform/proxyClient";
import {
  WooCommerceProduct,
  CreateProductDTO,
  UpdateProductDTO,
  ProductListParams,
} from "./types";

export const productsApi = {
  async list(params?: ProductListParams): Promise<WooCommerceProduct[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.per_page) searchParams.set("per_page", params.per_page.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.order) searchParams.set("order", params.order);
    if (params?.orderby) searchParams.set("orderby", params.orderby);
    if (params?.category) searchParams.set("category", params.category.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.sku) searchParams.set("sku", params.sku);
    const query = searchParams.toString();
    return proxyClient.request<WooCommerceProduct[]>(`/products${query ? `?${query}` : ""}`);
  },

  async get(id: number): Promise<WooCommerceProduct> {
    return proxyClient.request<WooCommerceProduct>(`/products/${id}`);
  },

  async create(data: CreateProductDTO): Promise<WooCommerceProduct> {
    return proxyClient.request<WooCommerceProduct>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: UpdateProductDTO): Promise<WooCommerceProduct> {
    return proxyClient.request<WooCommerceProduct>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: number, force: boolean = false): Promise<WooCommerceProduct> {
    return proxyClient.request<WooCommerceProduct>(`/products/${id}?force=${force}`, { method: "DELETE" });
  },

  async batch(operations: {
    create?: CreateProductDTO[];
    update?: (UpdateProductDTO & { id: number })[];
    delete?: number[];
  }) {
    return proxyClient.request<{
      create?: WooCommerceProduct[];
      update?: WooCommerceProduct[];
      delete?: WooCommerceProduct[];
    }>("/products/batch", {
      method: "POST",
      body: JSON.stringify(operations),
    });
  },

  async checkSkuExists(sku: string): Promise<boolean> {
    try {
      const products = await this.list({ sku, per_page: 1 });
      return products.length > 0;
    } catch {
      return false;
    }
  },
};
