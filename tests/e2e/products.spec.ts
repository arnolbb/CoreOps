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

test("products page supports categories, create, search, edit, and archive", async ({
  page,
}) => {
  const uniqueId = Date.now();
  const email = `products-owner-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `products-org-${uniqueId}`;

  await registerAndConfirm(page, email, password);
  await createOrganization(page, "Products Test Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Categories" }).click();
  const categoriesDialog = page.getByRole("dialog", {
    name: "Product Categories",
  });
  await expect(categoriesDialog).toBeVisible();
  await categoriesDialog.getByLabel("New Category Name").fill("Accessories");
  await categoriesDialog.getByRole("button", { name: "Add" }).click();
  await expect(categoriesDialog.getByText("Accessories")).toBeVisible();
  await categoriesDialog
    .getByRole("button", { name: "Close categories dialog" })
    .click();

  await page.getByRole("button", { name: "Add Product" }).click();
  const addDialog = page.getByRole("dialog", { name: "Add Product" });
  await expect(addDialog).toBeVisible();
  await addDialog.getByLabel("Product Type").selectOption("goods");
  await addDialog.getByLabel("Product Name *").fill("Filter Unit");
  await addDialog.getByLabel("SKU").fill("UNIT-100");
  await addDialog.getByLabel("Category").selectOption({ label: "Accessories" });
  await addDialog.getByLabel("Unit *").fill("pcs");
  await addDialog.getByLabel("Selling Price *").fill("150");
  await addDialog.getByLabel("Cost Price").fill("80");
  await addDialog.getByRole("button", { name: "Create Product" }).click();
  await expect(addDialog).toBeHidden();

  await expect(
    page.getByRole("row", { name: /Filter Unit.*UNIT-100/ }),
  ).toBeVisible();

  await page.getByLabel("Search products").fill("UNIT-100");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/search=UNIT-100/);
  await expect(
    page.getByRole("row", { name: /Filter Unit.*UNIT-100/ }),
  ).toBeVisible();

  const row = page.getByRole("row", { name: /Filter Unit/ });
  await row.getByRole("button", { name: "Edit Filter Unit" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Product" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Product Name *").fill("Filter Unit Pro");
  await editDialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(editDialog).toBeHidden();

  await expect(
    page.getByRole("row", { name: /Filter Unit Pro/ }),
  ).toBeVisible();

  const updatedRow = page.getByRole("row", { name: /Filter Unit Pro/ });
  await updatedRow
    .getByRole("button", { name: "Archive Filter Unit Pro" })
    .click();
  const archiveDialog = page.getByRole("dialog", { name: "Archive product?" });
  await expect(archiveDialog).toBeVisible();
  await archiveDialog.getByRole("button", { name: "Confirm archive" }).click();
  await expect(archiveDialog).toBeHidden();
  await expect(page.getByRole("row", { name: /Filter Unit Pro/ })).toHaveCount(
    0,
  );

  await page.getByLabel("Search products").fill("");
  await page.getByLabel("Status").selectOption("archived");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=archived/);
  await expect(
    page.getByRole("row", { name: /Filter Unit Pro.*Archived/ }),
  ).toBeVisible();
});
