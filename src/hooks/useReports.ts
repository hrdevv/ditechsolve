import { useQuery } from "@tanstack/react-query";
import { reportsApi, SalesReport, TopSeller, OrdersCount } from "@/lib/woocommerce/reports";
import { useWooCommerce } from "@/contexts/PlatformContext";

// Mock data for demo mode
const mockSalesReport: SalesReport[] = [
  {
    total_sales: "12459.99",
    net_sales: "11234.50",
    average_sales: "124.60",
    total_orders: 89,
    total_items: 156,
    total_tax: "1225.49",
    total_shipping: "445.00",
    total_refunds: 3,
    total_discount: "234.00",
    totals_grouped_by: "day",
    totals: {},
  },
];

const mockTopSellers: TopSeller[] = [
  { title: "Wireless Bluetooth Headphones", product_id: 1, quantity: 45 },
  { title: "Smart Fitness Watch", product_id: 2, quantity: 32 },
  { title: "Portable Charger 20000mAh", product_id: 3, quantity: 28 },
  { title: "USB-C Hub Adapter", product_id: 5, quantity: 22 },
  { title: "Mechanical Keyboard", product_id: 6, quantity: 18 },
];

const mockOrdersCounts: OrdersCount[] = [
  { slug: "pending", name: "Pending payment", total: 5 },
  { slug: "processing", name: "Processing", total: 12 },
  { slug: "on-hold", name: "On hold", total: 3 },
  { slug: "completed", name: "Completed", total: 156 },
  { slug: "cancelled", name: "Cancelled", total: 8 },
  { slug: "refunded", name: "Refunded", total: 3 },
  { slug: "failed", name: "Failed", total: 2 },
];

export const useSalesReport = (period?: "week" | "month" | "last_month" | "year") => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["salesReport", period],
    queryFn: async () => {
      if (!isConnected) {
        return mockSalesReport;
      }
      return reportsApi.getSalesReport({ period });
    },
  });
};

export const useTopSellers = (period?: "week" | "month" | "last_month" | "year") => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["topSellers", period],
    queryFn: async () => {
      if (!isConnected) {
        return mockTopSellers;
      }
      return reportsApi.getTopSellers({ period });
    },
  });
};

export const useOrdersCounts = () => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["ordersCounts"],
    queryFn: async () => {
      if (!isConnected) {
        return mockOrdersCounts;
      }
      return reportsApi.getOrdersCounts();
    },
  });
};

export const useProductsCounts = () => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["productsCounts"],
    queryFn: async () => {
      if (!isConnected) {
        return [
          { slug: "external", name: "External", total: 0 },
          { slug: "grouped", name: "Grouped", total: 2 },
          { slug: "simple", name: "Simple", total: 245 },
          { slug: "variable", name: "Variable", total: 12 },
        ];
      }
      return reportsApi.getProductsCounts();
    },
  });
};
