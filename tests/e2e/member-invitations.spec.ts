import { expect, test, type Page } from "@playwright/test";

const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type MailpitMessageSummary = {
  ID?: string;
  id?: string;
  To?: Array<{ Address?: string; address?: string }>;
  to?: Array<{ Address?: string; address?: string }>;
};

type MailpitMessagesResponse = {
  messages?: MailpitMessageSummary[];
};

type MailpitMessageDetail = {
  HTML?: string;
  Text?: string;
  html?: string;
  text?: string;
};

function getMessageId(message: MailpitMessageSummary) {
  return message.ID ?? message.id;
}

function messageContainsRecipient(
  message: MailpitMessageSummary,
  email: string,
) {
  const recipients = message.To ?? message.to ?? [];

  return recipients.some((recipient) => {
    const address = recipient.Address ?? recipient.address ?? "";
    return address.toLowerCase() === email.toLowerCase();
  });
}

async function getMessages() {
  const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=100`);

  if (!response.ok) {
    throw new Error(`Mailpit messages request failed: ${response.status}`);
  }

  return (await response.json()) as MailpitMessagesResponse;
}

async function getMessageDetail(id: string) {
  const response = await fetch(`${mailpitUrl}/api/v1/message/${id}`);

  if (!response.ok) {
    throw new Error(
      `Mailpit message detail request failed: ${response.status}`,
    );
  }

  return (await response.json()) as MailpitMessageDetail;
}

function extractSignupLink(detail: MailpitMessageDetail) {
  const content =
    `${detail.HTML ?? detail.html ?? ""}\n${detail.Text ?? detail.text ?? ""}`.replaceAll(
      "&amp;",
      "&",
    );
  const links =
    content.match(
      /https?:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify[^\s"'<>]+/g,
    ) ?? [];
  const matchingLink = links.find((link) => link.includes("type=signup"));

  if (!matchingLink) {
    throw new Error(
      "No Supabase signup verification link found in local email.",
    );
  }

  return matchingLink;
}

function extractInvitationLink(detail: MailpitMessageDetail) {
  const content =
    `${detail.HTML ?? detail.html ?? ""}\n${detail.Text ?? detail.text ?? ""}`.replaceAll(
      "&amp;",
      "&",
    );
  const links = content.match(/\/invitations\/accept-link\?[^\s"'<>]+/g) ?? [];
  const matchingLink = links.find((link) => link.includes("token="));

  if (!matchingLink) {
    throw new Error("No invitation accept link found in local email.");
  }

  return matchingLink.startsWith("http")
    ? matchingLink
    : `${appUrl}${matchingLink}`;
}

async function waitForMailFor(
  email: string,
  extract: (detail: MailpitMessageDetail) => string,
) {
  const deadline = Date.now() + 30_000;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    const messages = await getMessages();
    const matchingMessages = (messages.messages ?? []).filter((message) =>
      messageContainsRecipient(message, email),
    );

    for (const message of matchingMessages) {
      const id = getMessageId(message);

      if (!id) {
        continue;
      }

      const detail = await getMessageDetail(id);

      try {
        return extract(detail);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError ?? new Error(`Timed out waiting for mail to ${email}.`);
}

async function registerAndConfirm(page: Page, email: string, password: string) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Check your email to confirm your account."),
  ).toBeVisible();

  const confirmationLink = await waitForMailFor(email, extractSignupLink);
  await page.goto(confirmationLink);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function createOrganization(page: Page, name: string, slug: string) {
  await page.getByLabel("Organization name").fill(name);
  await page.getByLabel("Organization address").fill(slug);
  await page.getByLabel("Business type").selectOption("general");
  await page.getByLabel("Timezone").selectOption("UTC");
  await page.getByLabel("Currency").selectOption("USD");
  await page.getByRole("button", { name: "Create organization" }).click();
}

async function inviteMember(page: Page, email: string, role: string) {
  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Role").selectOption(role);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("Invitation sent.")).toBeVisible();
}

test("owner invites member who registers and accepts the invitation", async ({
  page,
}) => {
  const uniqueId = Date.now();
  const ownerEmail = `invite-owner-${uniqueId}@example.test`;
  const inviteeEmail = `invitee-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `invite-org-${uniqueId}`;

  await registerAndConfirm(page, ownerEmail, password);
  await createOrganization(page, "Invite Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  await inviteMember(page, inviteeEmail, "Staff");
  await expect(page.getByText(inviteeEmail)).toBeVisible();

  const invitationLink = await waitForMailFor(
    inviteeEmail,
    extractInvitationLink,
  );

  await page.context().clearCookies();

  await registerAndConfirm(page, inviteeEmail, password);
  await expect(page).toHaveURL(/\/onboarding\/organization$/);

  await page.goto(invitationLink);
  await expect(page).toHaveURL(/\/invitations\/accept$/);
  await expect(
    page.getByRole("heading", { name: "Accept invitation" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.context().clearCookies();
  await signIn(page, inviteeEmail, password);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("invitation cannot be accepted by a signed-in user with the wrong email", async ({
  page,
}) => {
  const uniqueId = Date.now();
  const ownerEmail = `wrong-owner-${uniqueId}@example.test`;
  const inviteeEmail = `wrong-invitee-${uniqueId}@example.test`;
  const intruderEmail = `wrong-intruder-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `wrong-org-${uniqueId}`;

  await registerAndConfirm(page, ownerEmail, password);
  await createOrganization(page, "Wrong Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  await inviteMember(page, inviteeEmail, "Staff");
  await page.context().clearCookies();

  await registerAndConfirm(page, intruderEmail, password);
  await expect(page).toHaveURL(/\/onboarding\/organization$/);

  const invitationLink = await waitForMailFor(
    inviteeEmail,
    extractInvitationLink,
  );
  await page.goto(invitationLink);

  await expect(
    page.getByRole("heading", { name: "Use the invited email" }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Sign out and use the invited email to accept this invitation.",
    ),
  ).toBeVisible();
});
