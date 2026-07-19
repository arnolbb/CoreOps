import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database-generated";
import type { CreateOrganizationInput } from "../schemas/create-organization-schema";
import type { CreatedOrganization } from "../types/organization";

export type CreateOrganizationResult =
  | {
      ok: true;
      organization: CreatedOrganization;
    }
  | {
      ok: false;
      code: "DUPLICATE_SLUG" | "AUTH_REQUIRED" | "VALIDATION_ERROR" | "UNKNOWN";
      message: string;
    };

type RpcError = {
  code?: string;
  message?: string;
};

function mapCreateOrganizationError(error: RpcError): CreateOrganizationResult {
  if (error.code === "23505") {
    return {
      ok: false,
      code: "DUPLICATE_SLUG",
      message: "This organization address is unavailable.",
    };
  }

  if (error.code === "42501") {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "You do not have access to perform this action.",
    };
  }

  if (error.code === "23514" || error.code === "22001") {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Check organization details and try again.",
    };
  }

  return {
    ok: false,
    code: "UNKNOWN",
    message: "Something went wrong. Try again.",
  };
}

export async function createOrganization(
  supabase: SupabaseClient<Database>,
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const { data, error } = await supabase.rpc("create_organization", {
    organization_name: input.name,
    organization_slug: input.slug,
    organization_business_type: input.businessType,
    organization_timezone: input.timezone,
    organization_currency_code: input.currencyCode,
    organization_settings: {} satisfies Json,
  });

  if (error) {
    return mapCreateOrganizationError(error);
  }

  if (!data) {
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Try again.",
    };
  }

  return {
    ok: true,
    organization: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      businessType: data.business_type,
      timezone: data.timezone,
      currencyCode: data.currency_code,
    },
  };
}
