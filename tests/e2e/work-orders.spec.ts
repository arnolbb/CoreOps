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
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
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
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
}

test("work orders lifecycle supports create, start, item consumption updating inventory, complete lock, and reopen", async ({
  page,
}) => {
  const uniqueId = Date.now();
  const email = `work-orders-owner-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `work-orders-org-${uniqueId}`;

  await registerAndConfirm(page, email, password);
  await createOrganization(page, "Work Orders Test Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers$/);
  await page.getByRole("button", { name: "Add Customer", exact: true }).click();
  const customerDialog = page.getByRole("dialog", { name: "Add Customer" });
  await expect(customerDialog).toBeVisible();
  await customerDialog.getByLabel("Display Name *").fill("Northwind Facility");
  await customerDialog.getByLabel("Address Line 1").fill("100 Harbor Blvd");
  await customerDialog.getByLabel("City").fill("Jakarta");
  await customerDialog
    .getByRole("button", { name: "Create Customer", exact: true })
    .click();
  await expect(customerDialog).toBeHidden();
  await expect(
    page.getByRole("row", { name: /Northwind Facility/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await page.getByRole("button", { name: "Add Product", exact: true }).click();
  const productDialog = page.getByRole("dialog", { name: "Add Product" });
  await expect(productDialog).toBeVisible();
  await productDialog.getByLabel("Product Type").selectOption("goods");
  await productDialog.getByLabel("Product Name *").fill("Replacement Valve");
  await productDialog.getByLabel("SKU").fill("VLV-01");
  await productDialog.getByLabel("Unit *").fill("pcs");
  await productDialog.getByLabel("Selling Price *").fill("35");
  await productDialog.getByLabel("Cost Price").fill("15");
  await productDialog
    .getByRole("button", { name: "Create Product", exact: true })
    .click();
  await expect(productDialog).toBeHidden();

  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/inventory$/);

  await page.getByRole("button", { name: "Warehouses", exact: true }).click();
  const warehousesDialog = page.getByRole("dialog", {
    name: "Manage Warehouses",
  });
  await expect(warehousesDialog).toBeVisible();
  await warehousesDialog.getByLabel("Warehouse Name *").fill("Central Depot");
  await warehousesDialog.getByLabel("Warehouse Code *").fill("DEPOT-1");
  await warehousesDialog
    .getByRole("button", { name: "Add Warehouse", exact: true })
    .click();
  await expect(warehousesDialog.getByText("DEPOT-1")).toBeVisible();
  await warehousesDialog
    .getByRole("button", { name: "Close warehouses dialog", exact: true })
    .click();
  await expect(warehousesDialog).toBeHidden();

  await page.getByRole("button", { name: "Adjust Stock", exact: true }).click();
  const adjustDialog = page.getByRole("dialog", { name: "Adjust Stock" });
  await expect(adjustDialog).toBeVisible();
  await adjustDialog
    .getByLabel("Warehouse *")
    .selectOption({ label: "Central Depot (DEPOT-1)" });
  await adjustDialog
    .getByLabel("Product *")
    .selectOption({ label: "Replacement Valve (VLV-01)" });
  await adjustDialog
    .getByLabel("Adjustment Type *")
    .selectOption("opening_stock");
  await adjustDialog.getByLabel("Quantity *").fill("20");
  await adjustDialog
    .getByRole("button", { name: "Apply Adjustment", exact: true })
    .click();
  await expect(adjustDialog).toBeHidden();
  await expect(
    page.getByRole("row", { name: /Replacement Valve.*20 pcs.*In Stock/ }),
  ).toBeVisible();

  await page.goto("/dashboard/work-orders");
  await expect(
    page.getByRole("heading", { name: "Work Orders", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "New Work Order", exact: true })
    .click();
  const woDialog = page.getByRole("dialog", { name: "New Work Order" });
  await expect(woDialog).toBeVisible();
  await woDialog
    .getByLabel("Customer *")
    .selectOption({ label: "Northwind Facility" });
  await woDialog
    .getByLabel("Site Address")
    .selectOption({ label: "Primary — 100 Harbor Blvd, Jakarta" });
  await woDialog.getByLabel("Work Type *").selectOption("service");
  await woDialog.getByLabel("Priority *").selectOption("high");
  await woDialog.getByLabel("Initial Status").selectOption("scheduled");
  await woDialog
    .getByLabel("Description *")
    .fill("Inspect assembly and replace worn valve");
  await woDialog
    .getByRole("button", { name: "Create Work Order", exact: true })
    .click();
  await expect(woDialog).toBeHidden();

  const woRow = page.getByRole("row", { name: /WO-.*Northwind Facility/ });
  await expect(woRow).toBeVisible();
  await woRow.getByRole("link", { name: "View", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/work-orders\/[0-9a-f-]+$/);
  const detailUrl = page.url();

  await page.getByRole("button", { name: "Start Work", exact: true }).click();
  await expect(page.getByText("In Progress", { exact: true })).toBeVisible();

  await page
    .getByLabel("Warehouse *")
    .selectOption({ label: "Central Depot (DEPOT-1)" });
  await page
    .getByLabel("Product *")
    .selectOption({ label: "Replacement Valve (VLV-01)" });
  await page.getByLabel("Quantity *").fill("3");
  await page
    .getByRole("button", { name: "Record Used Item", exact: true })
    .click();
  await expect(
    page.getByRole("row", { name: /Replacement Valve.*3 pcs/ }),
  ).toBeVisible();

  await page.goto("/dashboard/inventory");
  await expect(
    page.getByRole("row", { name: /Replacement Valve.*17 pcs.*In Stock/ }),
  ).toBeVisible();

  await page.goto(detailUrl);
  await page
    .getByRole("button", { name: "Complete Work Order", exact: true })
    .click();
  const completeDialog = page.getByRole("dialog", {
    name: "Complete Work Order",
  });
  await expect(completeDialog).toBeVisible();
  await completeDialog
    .getByLabel("Completion Notes *")
    .fill("Valve replaced and pressure verified.");
  await completeDialog
    .getByRole("button", { name: "Confirm Completion", exact: true })
    .click();
  await expect(completeDialog).toBeHidden();

  await expect(
    page.getByRole("heading", { name: "Completed & Locked", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Valve replaced and pressure verified."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Work Order", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Record Used Item", exact: true }),
  ).toHaveCount(0);

  await page
    .getByRole("button", { name: "Reopen Work Order", exact: true })
    .click();
  const reopenDialog = page.getByRole("dialog", { name: "Reopen Work Order" });
  await expect(reopenDialog).toBeVisible();
  await reopenDialog
    .getByLabel("Reopen Reason *")
    .fill("Follow-up inspection requested by customer.");
  await reopenDialog
    .getByRole("button", { name: "Confirm Reopen", exact: true })
    .click();
  await expect(reopenDialog).toBeHidden();

  await expect(page.getByText("In Progress", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record Used Item", exact: true }),
  ).toBeVisible();
});
