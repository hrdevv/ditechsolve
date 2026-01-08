import { z } from "zod";

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  sku: z
    .string()
    .max(100, "SKU must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  regular_price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Price must be a valid positive number"
    ),
  sale_price: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      "Sale price must be a valid positive number"
    ),
  short_description: z
    .string()
    .max(500, "Short description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
  status: z.enum(["draft", "publish", "pending", "private"]),
  catalog_visibility: z.enum(["visible", "catalog", "search", "hidden"]),
  manage_stock: z.boolean(),
  stock_quantity: z
    .number()
    .int()
    .min(0, "Stock quantity cannot be negative")
    .optional()
    .nullable(),
  stock_status: z.enum(["instock", "outofstock", "onbackorder"]),
  low_stock_amount: z
    .number()
    .int()
    .min(0, "Low stock amount cannot be negative")
    .optional()
    .nullable(),
  categories: z.array(z.number()).optional(),
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        src: z.string(),
        name: z.string().optional(),
        alt: z.string().optional(),
        file: z.instanceof(File).optional(),
      })
    )
    .optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const defaultProductValues: ProductFormData = {
  name: "",
  sku: "",
  regular_price: "",
  sale_price: "",
  short_description: "",
  description: "",
  status: "draft",
  catalog_visibility: "visible",
  manage_stock: false,
  stock_quantity: null,
  stock_status: "instock",
  low_stock_amount: null,
  categories: [],
  images: [],
};

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(200, "Category name must be less than 200 characters"),
  slug: z
    .string()
    .max(200, "Slug must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  parent: z.number().optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
