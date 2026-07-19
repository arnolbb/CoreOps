"use server";

import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodErrorToActionState } from "@/lib/validation/zod-action-state";
import { createOrganizationSchema } from "../schemas/create-organization-schema";
import { createOrganization } from "../services/create-organization";
import { getActiveOrganizationState } from "../queries/get-active-organization-memberships";

type OrganizationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function getRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export async function createOrganizationAction(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const membershipState = await getActiveOrganizationState(supabase, user.id);

  if (membershipState.status === "error") {
    return {
      status: "error",
      message: membershipState.message,
    };
  }

  if (
    membershipState.status === "single" ||
    membershipState.status === "multiple"
  ) {
    redirect("/dashboard");
  }

  const parsed = createOrganizationSchema.safeParse({
    name: getRequiredString(formData, "name"),
    slug: getRequiredString(formData, "slug"),
    businessType: getRequiredString(formData, "businessType"),
    timezone: getRequiredString(formData, "timezone"),
    currencyCode: getRequiredString(formData, "currencyCode"),
  });

  if (!parsed.success) {
    return zodErrorToActionState(parsed.error);
  }

  const result = await createOrganization(supabase, parsed.data);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

  redirect("/dashboard");
}
