export type CustomerStatus = "active" | "archived";

export type CustomerListStatusFilter = CustomerStatus | "all";

export type CustomerListItem = {
  id: string;
  displayName: string;
  customerType: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type CustomerListFilters = {
  search: string;
  status: CustomerListStatusFilter;
  page: number;
};

export type CustomerListData = {
  filters: CustomerListFilters;
  items: CustomerListItem[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
