import { spawnSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

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

function extractVerificationLink(detail: MailpitMessageDetail) {
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

async function waitForSignupLink(email: string) {
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
        return extractVerificationLink(detail);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw (
    lastError ?? new Error(`Timed out waiting for signup email to ${email}.`)
  );
}

async function registerAndConfirm(page: Page, email: string, password: string) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Check your email to confirm your account."),
  ).toBeVisible();

  const confirmationLink = await waitForSignupLink(email);
  await page.goto(confirmationLink);
}

async function createOrganization(page: Page, name: string, slug: string) {
  await page.getByLabel("Organization name").fill(name);
  await page.getByLabel("Organization address").fill(slug);
  await page.getByLabel("Business type").selectOption("general");
  await page.getByLabel("Timezone").selectOption("UTC");
  await page.getByLabel("Currency").selectOption("USD");
  await page.getByRole("button", { name: "Create organization" }).click();
}

function run(command: string, args: string[], input?: string) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  return result.stdout;
}

function findDatabaseContainer() {
  const output = run("docker", [
    "ps",
    "--format",
    "{{.Names}}",
    "--filter",
    "name=supabase_db_",
  ]);
  const containers = output
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  const preferred = containers.find((name) => name === "supabase_db_CoreOps");
  const container = preferred ?? containers[0];

  if (!container) {
    throw new Error("No local Supabase database container found.");
  }

  return container;
}

function sqlLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function seedCustomers({
  email,
  slug,
  activeName,
  archivedName,
}: {
  email: string;
  slug: string;
  activeName: string;
  archivedName: string;
}) {
  const sql = `
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      company_name,
      phone,
      email,
      status,
      notes,
      created_by,
      archived_at
    ) values
      (
        (select id from public.organizations where slug = ${sqlLiteral(slug)}),
        'business',
        ${sqlLiteral(activeName)},
        'Searchable Company',
        '+620000001234',
        'searchable-customer@example.test',
        'active',
        null,
        (select id from auth.users where email = ${sqlLiteral(email)}),
        null
      ),
      (
        (select id from public.organizations where slug = ${sqlLiteral(slug)}),
        'individual',
        ${sqlLiteral(archivedName)},
        null,
        '+620000005555',
        'archived-customer@example.test',
        'archived',
        null,
        (select id from auth.users where email = ${sqlLiteral(email)}),
        now()
      );
  `;

  run(
    "docker",
    [
      "exec",
      "-i",
      findDatabaseContainer(),
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-f",
      "-",
    ],
    sql,
  );
}

test("customer list supports search and status filters", async ({ page }) => {
  const uniqueId = Date.now();
  const email = `customer-list-owner-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `customer-list-${uniqueId}`;
  const activeName = `Active Customer ${uniqueId}`;
  const archivedName = `Archived Customer ${uniqueId}`;

  await registerAndConfirm(page, email, password);
  await createOrganization(page, "Customer List Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  seedCustomers({ email, slug, activeName, archivedName });

  await page.goto("/dashboard/customers");
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(activeName) }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(archivedName) }),
  ).toHaveCount(0);

  await page
    .getByLabel("Search customers")
    .fill("searchable-customer@example.test");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/search=searchable-customer/);
  await expect(
    page.getByRole("row", { name: new RegExp(activeName) }),
  ).toBeVisible();

  await page.getByLabel("Search customers").fill("");
  await page.getByLabel("Status").selectOption("archived");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=archived/);
  await expect(
    page.getByRole("row", { name: new RegExp(archivedName) }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(activeName) }),
  ).toHaveCount(0);
});
