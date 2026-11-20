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

test("inventory page supports warehouse creation, opening stock, adjustments, insufficient stock error, and low-stock filter", async ({
  page,
}) => {
  const uniqueId = Date.now();
  const email = `inventory-owner-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `inventory-org-${uniqueId}`;

  await registerAndConfirm(page, email, password);
  await createOrganization(page, "Inventory Test Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Products" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);

  await page.getByRole("button", { name: "Add Product" }).click();
  const productDialog = page.getByRole("dialog", { name: "Add Product" });
  await productDialog.getByLabel("Product Type").selectOption("goods");
  await productDialog.getByLabel("Product Name *").fill("Filter Cartridge");
  await productDialog.getByLabel("SKU").fill("CART-01");
  await productDialog.getByLabel("Unit *").fill("pcs");
  await productDialog.getByLabel("Selling Price *").fill("40");
  await productDialog.getByLabel("Cost Price").fill("20");
  await productDialog.getByLabel("Minimum Stock").fill("15");
  await productDialog.getByRole("button", { name: "Create Product" }).click();
  await expect(productDialog).toBeHidden();

  await page.getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/dashboard\/inventory$/);
  await expect(
    page.getByRole("heading", { name: "Inventory", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Warehouses" }).click();
  const warehousesDialog = page.getByRole("dialog", {
    name: "Manage Warehouses",
  });
  await expect(warehousesDialog).toBeVisible();
  await warehousesDialog.getByLabel("Warehouse Name *").fill("Main Warehouse");
  await warehousesDialog.getByLabel("Warehouse Code *").fill("wh-01");
  await warehousesDialog.getByRole("button", { name: "Add Warehouse" }).click();
  await expect(warehousesDialog.getByText("WH-01")).toBeVisible();
  await warehousesDialog
    .getByRole("button", { name: "Close warehouses dialog" })
    .click();
  await expect(warehousesDialog).toBeHidden();

  await page.getByRole("button", { name: "Adjust Stock", exact: true }).click();
  const adjustDialog = page.getByRole("dialog", { name: "Adjust Stock" });
  await expect(adjustDialog).toBeVisible();
  await adjustDialog.getByLabel("Warehouse *").selectOption({
    label: "Main Warehouse (WH-01)",
  });
  await adjustDialog.getByLabel("Product *").selectOption({
    label: "Filter Cartridge (CART-01)",
  });
  await adjustDialog
    .getByLabel("Adjustment Type *")
    .selectOption("opening_stock");
  await adjustDialog.getByLabel("Quantity *").fill("50");
  await adjustDialog.getByLabel(/Reason/).fill("Initial count");
  await adjustDialog.getByRole("button", { name: "Apply Adjustment" }).click();
  await expect(adjustDialog).toBeHidden();

  await expect(
    page.getByRole("row", { name: /Filter Cartridge.*50 pcs.*In Stock/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", {
      name: /Filter Cartridge.*Opening Stock.*\+50 pcs/,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Adjust Stock", exact: true }).click();
  const outDialog = page.getByRole("dialog", { name: "Adjust Stock" });
  await outDialog
    .getByLabel("Adjustment Type *")
    .selectOption("adjustment_out");
  await outDialog.getByLabel("Quantity *").fill("40");
  await outDialog.getByLabel(/Reason/).fill("Damaged stock");
  await outDialog.getByRole("button", { name: "Apply Adjustment" }).click();
  await expect(outDialog).toBeHidden();

  await expect(
    page.getByRole("row", { name: /Filter Cartridge.*10 pcs.*Low Stock/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", {
      name: /Filter Cartridge.*Adjustment Out.*-40 pcs.*Damaged stock/,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Adjust Stock", exact: true }).click();
  const overdrawDialog = page.getByRole("dialog", { name: "Adjust Stock" });
  await overdrawDialog
    .getByLabel("Adjustment Type *")
    .selectOption("adjustment_out");
  await overdrawDialog.getByLabel("Quantity *").fill("999");
  await overdrawDialog.getByLabel(/Reason/).fill("Overdraw test");
  await overdrawDialog
    .getByRole("button", { name: "Apply Adjustment" })
    .click();
  await expect(
    overdrawDialog.getByText("Insufficient stock balance for this adjustment."),
  ).toBeVisible();
  await overdrawDialog
    .getByRole("button", { name: "Close stock adjustment dialog" })
    .click();
  await expect(overdrawDialog).toBeHidden();

  await page.getByLabel("Stock status").selectOption("low_stock");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/stockFilter=low_stock/);
  await expect(
    page.getByRole("row", { name: /Filter Cartridge.*10 pcs.*Low Stock/ }),
  ).toBeVisible();
});
