import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { ProductHeaderActions } from "@/features/products/components/product-header-actions";
import { ProductList } from "@/features/products/components/product-list";
import { ProductListFiltersForm } from "@/features/products/components/product-list-filters";
import { getProductList } from "@/features/products/queries/get-product-list";
import { parseProductListSearchParams } from "@/features/products/schemas/product-list-search-schema";
import {
  canArchiveProducts,
  canManageProducts,
  canReadProducts,
  canViewProductCost,
} from "@/features/products/services/product-permissions";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProductPageSearchParams = Promise<{
  search?: string;
  status?: string;
  productType?: string;
  categoryId?: string;
  page?: string;
}>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: ProductPageSearchParams;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);
  const resolvedSearchParams = await searchParams;
  const filters = parseProductListSearchParams(resolvedSearchParams);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Products unavailable."
        message="Organization selection is required before products can be listed."
      />
    );
  }

  const role = organizationState.membership.role;

  if (!canReadProducts(role)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to products."
        message="Ask an Owner or Admin for access to product records."
      />
    );
  }

  const canManage = canManageProducts(role);
  const canArchive = canArchiveProducts(role);
  const canViewCost = canViewProductCost(role);

  const productList = await getProductList(
    supabase,
    organizationState.organization.id,
    filters,
    { canViewCost },
  );

  if (!productList.ok) {
    return (
      <OrganizationStateMessage
        title="Unable to load products."
        message={productList.message}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage products, services, and categories for{" "}
            {organizationState.organization.name}.
          </p>
        </div>
        <ProductHeaderActions
          canManage={canManage}
          canViewCost={canViewCost}
          categories={productList.data.categories}
        />
      </div>
      <ProductListFiltersForm
        filters={productList.data.filters}
        categories={productList.data.categories}
      />
      <ProductList
        data={productList.data}
        canManage={canManage}
        canArchive={canArchive}
        canViewCost={canViewCost}
      />
    </section>
  );
}
