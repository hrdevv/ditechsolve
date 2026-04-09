import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/woocommerce/categories";
import { useWooCommerce } from "@/contexts/PlatformContext";
import { activityLogger } from "@/lib/activityLogger";
import {
  WooCommerceCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryListParams,
} from "@/lib/woocommerce/types";

// Mock data for offline/demo mode
const mockCategories: WooCommerceCategory[] = [
  {
    id: 1,
    name: "Electronics",
    slug: "electronics",
    parent: 0,
    description: "Electronic devices and gadgets",
    display: "default",
    image: null,
    menu_order: 0,
    count: 45,
  },
  {
    id: 2,
    name: "Wearables",
    slug: "wearables",
    parent: 0,
    description: "Smartwatches and fitness trackers",
    display: "default",
    image: null,
    menu_order: 0,
    count: 23,
  },
  {
    id: 3,
    name: "Accessories",
    slug: "accessories",
    parent: 0,
    description: "Phone and computer accessories",
    display: "default",
    image: null,
    menu_order: 0,
    count: 67,
  },
  {
    id: 4,
    name: "Computer",
    slug: "computer",
    parent: 0,
    description: "Computer peripherals and components",
    display: "default",
    image: null,
    menu_order: 0,
    count: 34,
  },
];

export const useCategories = (params?: CategoryListParams) => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["categories", params],
    queryFn: async () => {
      if (!isConnected) {
        let filtered = [...mockCategories];
        if (params?.search) {
          const search = params.search.toLowerCase();
          filtered = filtered.filter((c) =>
            c.name.toLowerCase().includes(search)
          );
        }
        return filtered;
      }
      return categoriesApi.list(params);
    },
  });
};

export const useCategory = (id: number) => {
  const { isConnected } = useWooCommerce();

  return useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      if (!isConnected) {
        return mockCategories.find((c) => c.id === id) || null;
      }
      return categoriesApi.get(id);
    },
    enabled: id > 0,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { isConnected } = useWooCommerce();

  return useMutation({
    mutationFn: async (data: CreateCategoryDTO) => {
      if (!isConnected) {
        const newCategory: WooCommerceCategory = {
          id: Date.now(),
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
          parent: data.parent || 0,
          description: data.description || "",
          display: data.display || "default",
          image: null,
          menu_order: data.menu_order || 0,
          count: 0,
        };
        return newCategory;
      }
      return categoriesApi.create(data);
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      activityLogger.log("category_created", category.name, {
        entityId: category.id.toString(),
        details: `Slug: /${category.slug}`,
      });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { isConnected } = useWooCommerce();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCategoryDTO }) => {
      if (!isConnected) {
        const existing = mockCategories.find((c) => c.id === id);
        return { ...existing, ...data } as WooCommerceCategory;
      }
      return categoriesApi.update(id, data);
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category", category.id] });
      activityLogger.log("category_updated", category.name, {
        entityId: category.id.toString(),
      });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const { isConnected } = useWooCommerce();

  return useMutation({
    mutationFn: async ({ id, force = false }: { id: number; force?: boolean }) => {
      if (!isConnected) {
        const category = mockCategories.find((c) => c.id === id);
        return category as WooCommerceCategory;
      }
      return categoriesApi.delete(id, force);
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      activityLogger.log("category_deleted", category.name, {
        entityId: category.id.toString(),
      });
    },
  });
};
