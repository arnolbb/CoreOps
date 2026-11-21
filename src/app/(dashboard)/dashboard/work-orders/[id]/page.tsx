import Link from "next/link";
import { OrganizationStateMessage } from "@/features/organizations/components/organization-state-message";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { WorkOrderDetailClient } from "@/features/work-orders/components/work-order-detail-client";
import { getWorkOrderDetail } from "@/features/work-orders/queries/get-work-order-detail";
import {
  canManageWorkOrders,
  canOperateWorkOrder,
  canReadWorkOrders,
  canReopenWorkOrders,
} from "@/features/work-orders/services/work-order-permissions";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkOrderDetailPageParams = Promise<{
  id: string;
}>;

export default async function WorkOrderDetailPage({
  params,
}: {
  params: WorkOrderDetailPageParams;
}) {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return (
      <OrganizationStateMessage
        title="Work order unavailable."
        message="Organization selection is required before work order details can be viewed."
      />
    );
  }

  const role = organizationState.membership.role;

  if (!canReadWorkOrders(role)) {
    return (
      <OrganizationStateMessage
        title="You do not have access to work orders."
        message="Ask an Owner or Admin for access to work order records."
      />
    );
  }

  const { id } = await params;
  const detail = await getWorkOrderDetail(
    supabase,
    organizationState.organization.id,
    id,
    role,
    user.email,
    user.id,
  );

  if (!detail.ok) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/work-orders"
          className="inline-block text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to Work Orders
        </Link>
        <OrganizationStateMessage
          title="Work order unavailable."
          message={detail.message}
        />
      </div>
    );
  }

  const canManage = canManageWorkOrders(role);
  const canReopen = canReopenWorkOrders(role);
  const canOperate = canOperateWorkOrder(
    role,
    detail.data.workOrder.assignedTo,
    user.id,
  );

  return (
    <WorkOrderDetailClient
      data={detail.data}
      canManage={canManage}
      canReopen={canReopen}
      canOperate={canOperate}
    />
  );
}
