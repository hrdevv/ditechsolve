import { proxyClient } from "@/lib/platform/proxyClient";

export interface SalesReport {
  total_sales: string;
  net_sales: string;
  average_sales: string;
  total_orders: number;
  total_items: number;
  total_tax: string;
  total_shipping: string;
  total_refunds: number;
  total_discount: string;
  totals_grouped_by: string;
  totals: Record<string, {
    sales: string;
    orders: number;
    items: number;
    tax: string;
    shipping: string;
    discount: string;
    customers: number;
  }>;
}

export interface TopSeller {
  title: string;
  product_id: number;
  quantity: number;
}

export interface OrdersCount {
  slug: string;
  name: string;
  total: number;
}

export const reportsApi = {
  async getSalesReport(params?: {
    period?: "week" | "month" | "last_month" | "year";
    date_min?: string;
    date_max?: string;
  }): Promise<SalesReport[]> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    if (params?.date_min) searchParams.set("date_min", params.date_min);
    if (params?.date_max) searchParams.set("date_max", params.date_max);
    const query = searchParams.toString();
    return proxyClient.request<SalesReport[]>(`/reports/sales${query ? `?${query}` : ""}`);
  },

  async getTopSellers(params?: {
    period?: "week" | "month" | "last_month" | "year";
  }): Promise<TopSeller[]> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set("period", params.period);
    const query = searchParams.toString();
    return proxyClient.request<TopSeller[]>(`/reports/top_sellers${query ? `?${query}` : ""}`);
  },

  async getOrdersCounts(): Promise<OrdersCount[]> {
    return proxyClient.request<OrdersCount[]>("/reports/orders/totals");
  },

  async getProductsCounts(): Promise<{ slug: string; name: string; total: number }[]> {
    return proxyClient.request("/reports/products/totals");
  },
};
