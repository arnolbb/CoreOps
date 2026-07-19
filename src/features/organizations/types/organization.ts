export type ActiveOrganizationMembership = {
  organizationId: string;
  role: string;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export type ActiveOrganizationState =
  | {
      status: "none";
    }
  | {
      status: "single";
      membership: ActiveOrganizationMembership;
      organization: OrganizationSummary;
    }
  | {
      status: "multiple";
      memberships: ActiveOrganizationMembership[];
    }
  | {
      status: "error";
      message: string;
    };

export type CreatedOrganization = OrganizationSummary & {
  businessType: string;
  timezone: string;
  currencyCode: string;
};
