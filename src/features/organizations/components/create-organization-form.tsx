"use client";

import { useActionState, useState } from "react";
import { FieldError } from "@/features/auth/components/field-error";
import { FormMessage } from "@/features/auth/components/form-message";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { createOrganizationAction } from "../actions/create-organization";
import {
  businessTypeOptions,
  currencyCodeOptions,
  generateOrganizationSlug,
  timezoneOptions,
} from "../schemas/create-organization-schema";

const idleOrganizationActionState = {
  status: "idle" as const,
};

const businessTypeLabels: Record<(typeof businessTypeOptions)[number], string> =
  {
    general: "General business",
    service: "Service business",
    retail: "Retail",
    distribution: "Distribution",
    manufacturing: "Manufacturing",
    nonprofit: "Nonprofit",
  };

export function CreateOrganizationForm() {
  const [state, formAction] = useActionState(
    createOrganizationAction,
    idleOrganizationActionState,
  );
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Organization name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="organization"
          required
          onChange={(event) => {
            if (!slugEdited) {
              setSlug(generateOrganizationSlug(event.currentTarget.value));
            }
          }}
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div className="space-y-2">
        <label htmlFor="slug" className="text-sm font-medium">
          Organization address
        </label>
        <div className="flex rounded-md border border-black/10 focus-within:border-foreground dark:border-white/15">
          <span className="border-r border-black/10 px-3 py-2 text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
            coreops/
          </span>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(generateOrganizationSlug(event.currentTarget.value));
            }}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Use lowercase letters, numbers, and dashes.
        </p>
        <FieldError errors={state.fieldErrors?.slug} />
      </div>
      <div className="space-y-2">
        <label htmlFor="businessType" className="text-sm font-medium">
          Business type
        </label>
        <select
          id="businessType"
          name="businessType"
          defaultValue="general"
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
        >
          {businessTypeOptions.map((option) => (
            <option key={option} value={option}>
              {businessTypeLabels[option]}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.businessType} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue="UTC"
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
          >
            {timezoneOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.timezone} />
        </div>
        <div className="space-y-2">
          <label htmlFor="currencyCode" className="text-sm font-medium">
            Currency
          </label>
          <select
            id="currencyCode"
            name="currencyCode"
            defaultValue="USD"
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/15"
          >
            {currencyCodeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.currencyCode} />
        </div>
      </div>
      <SubmitButton>Create organization</SubmitButton>
    </form>
  );
}
