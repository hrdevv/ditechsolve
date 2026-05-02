import { proxyClient } from "@/lib/platform/proxyClient";
import {
  WooCommerceCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryListParams,
} from "./types";

export const categoriesApi = {
  async list(params?: CategoryListParams): Promise<WooCommerceCategory[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.per_page) searchParams.set("per_page", params.per_page.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.order) searchParams.set("order", params.order);
    if (params?.orderby) searchParams.set("orderby", params.orderby);
    if (params?.parent !== undefined) searchParams.set("parent", params.parent.toString());
    if (params?.hide_empty !== undefined) searchParams.set("hide_empty", params.hide_empty.toString());
    const query = searchParams.toString();
    return proxyClient.request<WooCommerceCategory[]>(`/products/categories${query ? `?${query}` : ""}`);
  },

  async get(id: number): Promise<WooCommerceCategory> {
    return proxyClient.request<WooCommerceCategory>(`/products/categories/${id}`);
  },

  async create(data: CreateCategoryDTO): Promise<WooCommerceCategory> {
    return proxyClient.request<WooCommerceCategory>("/products/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: UpdateCategoryDTO): Promise<WooCommerceCategory> {
    return proxyClient.request<WooCommerceCategory>(`/products/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: number, force: boolean = false): Promise<WooCommerceCategory> {
    return proxyClient.request<WooCommerceCategory>(`/products/categories/${id}?force=${force}`, { method: "DELETE" });
  },

  async batch(operations: {
    create?: CreateCategoryDTO[];
    update?: (UpdateCategoryDTO & { id: number })[];
    delete?: number[];
  }) {
    return proxyClient.request<{
      create?: WooCommerceCategory[];
      update?: WooCommerceCategory[];
      delete?: WooCommerceCategory[];
    }>("/products/categories/batch", {
      method: "POST",
      body: JSON.stringify(operations),
    });
  },
};
