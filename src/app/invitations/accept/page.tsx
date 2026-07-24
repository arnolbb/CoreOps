import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { signOutForInvitationAction } from "@/features/organizations/actions/sign-out-for-invitation";
import { AcceptInvitationPanel } from "@/features/organizations/components/accept-invitation-panel";
import { getInvitationPreview } from "@/features/organizations/services/get-invitation-preview";
import {
  hashInvitationToken,
  INVITATION_TOKEN_COOKIE,
  parseInvitationToken,
} from "@/features/organizations/services/invitation-tokens";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AcceptInvitationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const stateMessages: Record<string, string> = {
  accepted: "This invitation has already been used.",
  expired: "This invitation expired. Ask for a new invitation.",
  invalid: "This invitation link is invalid.",
  revoked: "This invitation is no longer valid.",
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined>,
  name: string,
) {
  const value = searchParams[name];
  return typeof value === "string" ? value : undefined;
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const resolvedSearchParams = await searchParams;
  const state = getStringParam(resolvedSearchParams, "state");

  if (state && stateMessages[state]) {
    return (
      <AuthFormShell
        title="Invitation unavailable"
        description={stateMessages[state]}
        footer={
          <Link
            href="/sign-in"
            className="font-medium underline underline-offset-4"
          >
            Sign in
          </Link>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ask an Owner or Admin to send a new invitation if you still need
          access.
        </p>
      </AuthFormShell>
    );
  }

  const cookieStore = await cookies();
  const rawToken = parseInvitationToken(
    cookieStore.get(INVITATION_TOKEN_COOKIE)?.value,
  );

  if (!rawToken) {
    redirect("/invitations/accept/clear?state=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const previewResult = await getInvitationPreview(
    supabase,
    hashInvitationToken(rawToken),
  );

  if (!previewResult.ok) {
    if (
      previewResult.status === "invalid" ||
      previewResult.status === "expired" ||
      previewResult.status === "revoked" ||
      previewResult.status === "accepted"
    ) {
      redirect(`/invitations/accept/clear?state=${previewResult.status}`);
    }

    return (
      <AuthFormShell
        title="Invitation unavailable"
        description={previewResult.message}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Try again later.
        </p>
      </AuthFormShell>
    );
  }

  const user = await getAuthenticatedUser();
  const preview = previewResult.preview;
  const userEmail = user?.email?.toLowerCase();
  const invitedEmail = preview.email.toLowerCase();

  if (!user) {
    return (
      <AuthFormShell
        title="Accept invitation"
        description={`You were invited to join ${preview.organizationName} as ${formatRole(preview.role)}.`}
        footer={
          <>
            Need an account?{" "}
            <Link
              href="/register?next=%2Finvitations%2Faccept"
              className="font-medium underline underline-offset-4"
            >
              Register
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Sign in or create an account with the invited email to accept this
            invitation.
          </p>
          <Link
            href="/sign-in?next=%2Finvitations%2Faccept"
            className="block w-full rounded-md bg-foreground px-4 py-2 text-center text-sm font-semibold text-background transition hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </AuthFormShell>
    );
  }

  if (userEmail !== invitedEmail) {
    return (
      <AuthFormShell
        title="Use the invited email"
        description="Sign out and use the invited email to accept this invitation."
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            You are signed in as {user.email}. This invitation is for a
            different email address.
          </p>
          <form action={signOutForInvitationAction}>
            <button
              type="submit"
              className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              Sign out
            </button>
          </form>
        </div>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Accept invitation"
      description={`Join ${preview.organizationName} as ${formatRole(preview.role)}.`}
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          This invitation expires on {new Date(preview.expiresAt).toUTCString()}
          .
        </p>
        <AcceptInvitationPanel />
      </div>
    </AuthFormShell>
  );
}
