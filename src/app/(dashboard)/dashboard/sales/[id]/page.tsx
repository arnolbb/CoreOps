import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { SalesOrderDetailClient } from "@/features/sales/components/sales-order-detail-client";
import { getSalesOrderDetail } from "@/features/sales/queries/get-sales-order-detail";
import {
  canAdminSales,
  canManageSales,
  canReadSales,
} from "@/features/sales/services/sales-permissions";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SalesOrderDetailPageParams = Promise<{
  id: string;
}>;

export default async function SalesOrderDetailPage({
  params,
}: {
  params: SalesOrderDetailPageParams;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);
  const { id } = await params;

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Sales order unavailable."
        message="Organization selection is required before sales orders can be viewed."
      />
    );
  }

  const role = organizationState.membership.role;

  if (!canReadSales(role)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to sales."
        message="Ask an Owner or Admin for access to sales records."
      />
    );
  }

  const detail = await getSalesOrderDetail(
    supabase,
    organizationState.organization.id,
    id,
  );

  if (!detail.ok) {
    return (
      <OrganizationStateMessage
        title="Sales order unavailable."
        message={detail.message}
      />
    );
  }

  return (
    <SalesOrderDetailClient
      order={detail.data}
      canManage={canManageSales(role)}
      canAdmin={canAdminSales(role)}
    />
  );
}
