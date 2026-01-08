export interface WooCommerceCredentials {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: "simple" | "grouped" | "external" | "variable";
  status: "draft" | "pending" | "private" | "publish";
  featured: boolean;
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  tax_status: "taxable" | "shipping" | "none";
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
  backorders: "no" | "notify" | "yes";
  low_stock_amount: number | null;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  categories: WooCommerceCategory[];
  tags: { id: number; name: string; slug: string }[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[];
  variations: number[];
  menu_order: number;
  meta_data: { key: string; value: string }[];
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: "default" | "products" | "subcategories" | "both";
  image: WooCommerceImage | null;
  menu_order: number;
  count: number;
}

export interface WooCommerceImage {
  id: number;
  date_created: string;
  date_modified: string;
  src: string;
  name: string;
  alt: string;
}

export interface WooCommerceAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface CreateProductDTO {
  name: string;
  type?: "simple" | "grouped" | "external" | "variable";
  status?: "draft" | "pending" | "private" | "publish";
  featured?: boolean;
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  description?: string;
  short_description?: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  backorders?: "no" | "notify" | "yes";
  low_stock_amount?: number;
  categories?: { id: number }[];
  tags?: { id: number }[];
  images?: { src: string; name?: string; alt?: string }[];
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

export interface CreateCategoryDTO {
  name: string;
  slug?: string;
  parent?: number;
  description?: string;
  display?: "default" | "products" | "subcategories" | "both";
  image?: { src: string; name?: string; alt?: string };
  menu_order?: number;
}

export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> {}

export interface WooCommerceListParams {
  page?: number;
  per_page?: number;
  search?: string;
  order?: "asc" | "desc";
  orderby?: string;
}

export interface ProductListParams extends WooCommerceListParams {
  category?: number;
  status?: "draft" | "pending" | "private" | "publish" | "any";
  sku?: string;
}

export interface CategoryListParams extends WooCommerceListParams {
  parent?: number;
  hide_empty?: boolean;
}

export interface WooCommerceSystemStatus {
  environment: {
    home_url: string;
    site_url: string;
    version: string;
    wp_version: string;
  };
  database: {
    wc_database_version: string;
  };
  active_plugins: { plugin: string; name: string; version: string }[];
}

export interface WordPressMedia {
  id: number;
  date: string;
  slug: string;
  type: string;
  link: string;
  title: { rendered: string };
  alt_text: string;
  source_url: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes?: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface ApiError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}
