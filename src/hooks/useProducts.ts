import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/woocommerce/products";
import { useWooCommerce } from "@/contexts/PlatformContext";
import { activityLogger } from "@/lib/activityLogger";
import {
  WooCommerceProduct,
  CreateProductDTO,
  UpdateProductDTO,
  ProductListParams,
} from "@/lib/woocommerce/types";

// Mock data for offline/demo mode
const mockProducts: WooCommerceProduct[] = [
  {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    slug: "wireless-bluetooth-headphones",
    permalink: "",
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    type: "simple",
    status: "publish",
    featured: false,
    catalog_visibility: "visible",
    description: "High-quality wireless headphones with noise cancellation",
    short_description: "Premium wireless headphones",
    sku: "WBH-001",
    price: "79.99",
    regular_price: "79.99",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 45,
    virtual: false,
    downloadable: false,
    tax_status: "taxable",
    tax_class: "",
    manage_stock: true,
    stock_quantity: 45,
    stock_status: "instock",
    backorders: "no",
    low_stock_amount: 5,
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    categories: [{ id: 1, name: "Electronics", slug: "electronics", parent: 0, description: "", display: "default", image: null, menu_order: 0, count: 45 }],
    tags: [],
    images: [],
    attributes: [],
    variations: [],
    menu_order: 0,
    meta_data: [],
  },
  {
    id: 2,
    name: "Smart Fitness Watch",
    slug: "smart-fitness-watch",
    permalink: "",
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    type: "simple",
    status: "publish",
    featured: true,
    catalog_visibility: "visible",
    description: "Track your fitness goals with this smart watch",
    short_description: "Advanced fitness tracking",
    sku: "SFW-002",
    price: "129.99",
    regular_price: "129.99",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 23,
    virtual: false,
    downloadable: false,
    tax_status: "taxable",
    tax_class: "",
    manage_stock: true,
    stock_quantity: 23,
    stock_status: "instock",
    backorders: "no",
    low_stock_amount: 5,
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    categories: [{ id: 2, name: "Wearables", slug: "wearables", parent: 0, description: "", display: "default", image: null, menu_order: 0, count: 23 }],
    tags: [],
    images: [],
    attributes: [],
    variations: [],
    menu_order: 0,
    meta_data: [],
  },
  {
    id: 3,
    name: "Portable Charger 20000mAh",
    slug: "portable-charger",
    permalink: "",
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    type: "simple",
    status: "publish",
    featured: false,
    catalog_visibility: "visible",
    description: "High capacity portable charger",
    short_description: "20000mAh power bank",
    sku: "PCH-003",
    price: "39.99",
    regular_price: "39.99",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 67,
    virtual: false,
    downloadable: false,
    tax_status: "taxable",
    tax_class: "",
    manage_stock: true,
    stock_quantity: 67,
    stock_status: "instock",
    backorders: "no",
    low_stock_amount: 10,
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    categories: [{ id: 3, name: "Accessories", slug: "accessories", parent: 0, description: "", display: "default", image: null, menu_order: 0, count: 67 }],
    tags: [],
    images: [],
    attributes: [],
    variations: [],
    menu_order: 0,
    meta_data: [],
  },
  {
    id: 4,
    name: "Wireless Mouse",
    slug: "wireless-mouse",
    permalink: "",
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    type: "simple",
    status: "draft",
    featured: false,
    catalog_visibility: "visible",
    description: "Ergonomic wireless mouse",
    short_description: "Comfortable wireless mouse",
    sku: "WMS-004",
    price: "24.99",
    regular_price: "24.99",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 0,
    virtual: false,
    downloadable: false,
    tax_status: "taxable",
    tax_class: "",
    manage_stock: true,
    stock_quantity: 0,
    stock_status: "outofstock",
    backorders: "no",
    low_stock_amount: 5,
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    categories: [{ id: 4, name: "Computer", slug: "computer", parent: 0, description: "", display: "default", image: null, menu_order: 0, count: 34 }],
    tags: [],
    images: [],
    attributes: [],
    variations: [],
    menu_order: 0,
    meta_data: [],
  },
];

export const useProducts = (params?: ProductListParams) => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      if (!isConnected) {
        // Return mock data in demo mode
        let filtered = [...mockProducts];
        if (params?.search) {
          const search = params.search.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(search) ||
              p.sku.toLowerCase().includes(search)
          );
        }
        return filtered;
      }
      return productsApi.list(params);
    },
  });
};

export const useProduct = (id: number) => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!isConnected) {
        return mockProducts.find((p) => p.id === id) || null;
      }
      return productsApi.get(id);
    },
    enabled: id > 0,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { isConnected } = useWooCommerce();

  return useMutation({
    mutationFn: async (data: CreateProductDTO) => {
      if (!isConnected) {
        // Mock create
        const newProduct: WooCommerceProduct = {
          id: Date.now(),
          ...data,
          slug: data.name?.toLowerCase().replace(/\s+/g, "-") || "",
          permalink: "",
          date_created: new Date().toISOString(),
          date_modified: new Date().toISOString(),
          type: data.type || "simple",
          status: data.status || "draft",
          featured: data.featured || false,
          catalog_visibility: data.catalog_visibility || "visible",
          description: data.description || "",
          short_description: data.short_description || "",
          sku: data.sku || "",
          price: data.regular_price || "0",
          regular_price: data.regular_price || "0",
          sale_price: data.sale_price || "",
          on_sale: !!data.sale_price,
          purchasable: true,
          total_sales: 0,
          virtual: false,
          downloadable: false,
          tax_status: "taxable",
          tax_class: "",
          manage_stock: data.manage_stock || false,
          stock_quantity: data.stock_quantity || null,
          stock_status: data.stock_status || "instock",
          backorders: data.backorders || "no",
          low_stock_amount: data.low_stock_amount || null,
          weight: "",
          dimensions: { length: "", width: "", height: "" },
          categories: [],
          tags: [],
          images: [],
          attributes: [],
          variations: [],
          menu_order: 0,
          meta_data: [],
        };
        return newProduct;
      }
      return productsApi.create(data);
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      activityLogger.log("product_created", product.name, {
        entityId: product.id.toString(),
        details: `SKU: ${product.sku || "N/A"}, Price: $${product.price}`,
      });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { isConnected } = useWooCommerce();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateProductDTO }) => {
      if (!isConnected) {
        const existing = mockProducts.find((p) => p.id === id);
        return { ...existing, ...data } as WooCommerceProduct;
      }
      return productsApi.update(id, data);
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      activityLogger.log("product_updated", product.name, {
        entityId: product.id.toString(),
      });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { isConnected } = useWooCommerce();

  return useMutation({
    mutationFn: async ({ id, force = false }: { id: number; force?: boolean }) => {
      if (!isConnected) {
        const product = mockProducts.find((p) => p.id === id);
        return product as WooCommerceProduct;
      }
      return productsApi.delete(id, force);
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      activityLogger.log("product_deleted", product.name, {
        entityId: product.id.toString(),
      });
    },
  });
};

export const useBatchProducts = () => {
  const queryClient = useQueryClient();
  const { isConnected } = useWooCommerce();

  return useMutation({
    mutationFn: async (operations: {
      create?: CreateProductDTO[];
      update?: (UpdateProductDTO & { id: number })[];
      delete?: number[];
    }) => {
      if (!isConnected) {
        // Mock batch operations
        const result: {
          create?: WooCommerceProduct[];
          update?: WooCommerceProduct[];
          delete?: WooCommerceProduct[];
        } = {};

        if (operations.update) {
          result.update = operations.update.map((op) => {
            const existing = mockProducts.find((p) => p.id === op.id);
            return { ...existing, ...op } as WooCommerceProduct;
          });
        }

        if (operations.delete) {
          result.delete = operations.delete.map((id) => {
            const product = mockProducts.find((p) => p.id === id);
            return product as WooCommerceProduct;
          });
        }

        return result;
      }
      return productsApi.batch(operations);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      if (result.update) {
        result.update.forEach((product) => {
          activityLogger.log("product_updated", product.name, {
            entityId: product.id.toString(),
            details: "Bulk update",
          });
        });
      }

      if (result.delete) {
        result.delete.forEach((product) => {
          activityLogger.log("product_deleted", product.name, {
            entityId: product.id.toString(),
            details: "Bulk delete",
          });
        });
      }
    },
  });
};
