export type ProductType = "goods" | "service";

export type ProductStatus = "active" | "archived";

export type ProductListStatusFilter = ProductStatus | "all";

export type ProductListTypeFilter = ProductType | "all";

export type ProductCategory = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductListItem = {
  id: string;
  productType: ProductType;
  name: string;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unit: string;
  costPrice: number | null;
  sellingPrice: number;
  trackInventory: boolean;
  minimumStock: number | null;
  isActive: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ProductDetail = ProductListItem & {
  description: string | null;
};

export type ProductListFilters = {
  search: string;
  status: ProductListStatusFilter;
  productType: ProductListTypeFilter;
  categoryId: string;
  page: number;
};

export type ProductListData = {
  filters: ProductListFilters;
  items: ProductListItem[];
  categories: ProductCategory[];
  currencyCode: string;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
