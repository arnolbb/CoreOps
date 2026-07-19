import { expect, test, type Page } from "@playwright/test";

const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessageSummary = {
  ID?: string;
  id?: string;
  Subject?: string;
  subject?: string;
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
  const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=50`);

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

function extractVerificationLink(
  detail: MailpitMessageDetail,
  type: "signup" | "recovery",
) {
  const content =
    `${detail.HTML ?? detail.html ?? ""}\n${detail.Text ?? detail.text ?? ""}`.replaceAll(
      "&amp;",
      "&",
    );
  const links =
    content.match(
      /https?:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify[^\s"'<>]+/g,
    ) ?? [];
  const matchingLink = links.find((link) => link.includes(`type=${type}`));

  if (!matchingLink) {
    throw new Error(
      `No Supabase ${type} verification link found in local email.`,
    );
  }

  return matchingLink;
}

async function waitForEmailLink(email: string, type: "signup" | "recovery") {
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
        return extractVerificationLink(detail, type);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw (
    lastError ?? new Error(`Timed out waiting for ${type} email to ${email}.`)
  );
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("registration, confirmation, sign-in, sign-out, password recovery, and invalid sessions", async ({
  page,
  context,
}) => {
  const uniqueId = Date.now();
  const email = `auth-${uniqueId}@example.test`;
  const firstPassword = "password123";
  const secondPassword = "newpassword123";

  await page.goto("/");
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(firstPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Check your email to confirm your account."),
  ).toBeVisible();

  const confirmationLink = await waitForEmailLink(email, "signup");
  await page.goto(confirmationLink);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Organization setup comes next.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);

  await signIn(page, email, firstPassword);

  await context.clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset instructions" }).click();
  await expect(
    page.getByText(
      "If an account exists, we sent password reset instructions.",
    ),
  ).toBeVisible();

  const recoveryLink = await waitForEmailLink(email, "recovery");
  await page.goto(recoveryLink);
  await expect(page).toHaveURL(/\/update-password$/);
  await page.getByLabel("New password").fill(secondPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?message=password-updated$/);
  await expect(
    page.getByText("Password updated. Sign in with your new password."),
  ).toBeVisible();

  await signIn(page, email, secondPassword);

  await page.goto("/auth/callback?flow=recovery&next=%2Fupdate-password");
  await expect(page).toHaveURL(
    /\/forgot-password\?error=recovery-link-invalid$/,
  );
  await expect(
    page.getByText("Reset link expired or invalid. Request a new one."),
  ).toBeVisible();
});
