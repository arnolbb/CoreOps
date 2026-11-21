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

test("sales lifecycle handles draft creation, stock validation, confirmation, partial/full payments, voiding, and cancellation stock restoration", async ({
  page,
}) => {
  const uniqueId = Date.now();
  const email = `sales-owner-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `sales-org-${uniqueId}`;

  await registerAndConfirm(page, email, password);
  await createOrganization(page, "Sales Test Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers$/);
  await page.getByRole("button", { name: "Add Customer", exact: true }).click();
  const customerDialog = page.getByRole("dialog", { name: "Add Customer" });
  await customerDialog.getByLabel("Display Name *").fill("Acme Buyer");
  await customerDialog
    .getByRole("button", { name: "Create Customer", exact: true })
    .click();
  await expect(customerDialog).toBeHidden();

  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await page.getByRole("button", { name: "Add Product", exact: true }).click();
  const productDialog = page.getByRole("dialog", { name: "Add Product" });
  await productDialog.getByLabel("Product Type").selectOption("goods");
  await productDialog.getByLabel("Product Name *").fill("Industrial Valve");
  await productDialog.getByLabel("SKU").fill("VLV-100");
  await productDialog.getByLabel("Unit *").fill("pcs");
  await productDialog.getByLabel("Selling Price *").fill("50");
  await productDialog.getByLabel("Cost Price").fill("25");
  await productDialog.getByLabel("Minimum Stock").fill("2");
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
  await warehousesDialog.getByLabel("Warehouse Name *").fill("Main Warehouse");
  await warehousesDialog.getByLabel("Warehouse Code *").fill("wh-01");
  await warehousesDialog
    .getByRole("button", { name: "Add Warehouse", exact: true })
    .click();
  await expect(warehousesDialog.getByText("WH-01")).toBeVisible();
  await warehousesDialog
    .getByRole("button", { name: "Close warehouses dialog", exact: true })
    .click();
  await expect(warehousesDialog).toBeHidden();

  await page.getByRole("button", { name: "Adjust Stock", exact: true }).click();
  const adjustDialog = page.getByRole("dialog", { name: "Adjust Stock" });
  await adjustDialog
    .getByLabel("Warehouse *")
    .selectOption({ label: "Main Warehouse (WH-01)" });
  await adjustDialog
    .getByLabel("Product *")
    .selectOption({ label: "Industrial Valve (VLV-100)" });
  await adjustDialog
    .getByLabel("Adjustment Type *")
    .selectOption("opening_stock");
  await adjustDialog.getByLabel("Quantity *").fill("10");
  await adjustDialog.getByLabel(/Reason/).fill("Opening stock");
  await adjustDialog
    .getByRole("button", { name: "Apply Adjustment", exact: true })
    .click();
  await expect(adjustDialog).toBeHidden();
  await expect(
    page.getByRole("row", { name: /Industrial Valve.*10 pcs.*In Stock/ }),
  ).toBeVisible();

  await page.goto("/dashboard/sales");
  await expect(
    page.getByRole("heading", { name: "Sales", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "New Sales Order", exact: true })
    .click();
  const draftDialog = page.getByRole("dialog", { name: "New Sales Order" });
  await expect(draftDialog).toBeVisible();
  await draftDialog
    .getByLabel("Customer *")
    .selectOption({ label: "Acme Buyer" });
  await draftDialog.getByLabel("Quantity *").fill("15");
  await draftDialog
    .getByRole("button", { name: "Create Draft", exact: true })
    .click();
  await expect(draftDialog).toBeHidden();

  await expect(
    page.getByRole("row", { name: /Acme Buyer.*Draft.*Unpaid.*\$750\.00/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "View", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/sales\/[0-9a-f-]+$/);
  const orderUrl = page.url();

  // Over-balance confirm triggers insufficient stock error
  await page
    .getByRole("button", { name: "Confirm Order", exact: true })
    .click();
  const confirmOverDialog = page.getByRole("dialog", {
    name: "Confirm Sales Order",
  });
  await expect(
    confirmOverDialog.getByText(/inventory-tracked goods/),
  ).toBeVisible();
  await confirmOverDialog
    .getByLabel("Fulfillment Warehouse *")
    .selectOption({ label: "Main Warehouse (WH-01)" });
  await confirmOverDialog
    .getByRole("button", { name: "Confirm Sales Order", exact: true })
    .click();
  await expect(
    confirmOverDialog.getByText(
      "Insufficient stock balance to confirm this sales order.",
    ),
  ).toBeVisible();
  await confirmOverDialog
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await expect(confirmOverDialog).toBeHidden();

  // Edit draft quantity to 4 ($200.00) and confirm
  await page.getByRole("button", { name: "Edit Draft", exact: true }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Draft Order" });
  await editDialog.getByLabel("Quantity *").fill("4");
  await editDialog
    .getByRole("button", { name: "Save Draft", exact: true })
    .click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByText("$200.00").first()).toBeVisible();

  await page
    .getByRole("button", { name: "Confirm Order", exact: true })
    .click();
  const confirmValidDialog = page.getByRole("dialog", {
    name: "Confirm Sales Order",
  });
  await confirmValidDialog
    .getByLabel("Fulfillment Warehouse *")
    .selectOption({ label: "Main Warehouse (WH-01)" });
  await confirmValidDialog
    .getByRole("button", { name: "Confirm Sales Order", exact: true })
    .click();
  await expect(confirmValidDialog).toBeHidden();
  await expect(
    page.getByText("Confirmed", { exact: true }).first(),
  ).toBeVisible();

  // Verify stock deducted in /dashboard/inventory
  await page.goto("/dashboard/inventory");
  await expect(
    page.getByRole("row", { name: /Industrial Valve.*6 pcs.*In Stock/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Industrial Valve.*Sale Out.*-4 pcs/ }),
  ).toBeVisible();

  // Return to order and record partial then full payments
  await page.goto(orderUrl);

  await page
    .getByRole("button", { name: "Record Payment", exact: true })
    .click();
  const partialPayDialog = page.getByRole("dialog", { name: "Record Payment" });
  await partialPayDialog.getByLabel("Amount *").fill("80");
  await partialPayDialog.getByLabel("Payment Method *").selectOption("cash");
  await partialPayDialog.getByLabel("Reference").fill("RCPT-1");
  await partialPayDialog
    .getByRole("button", { name: "Submit Payment", exact: true })
    .click();
  await expect(partialPayDialog).toBeHidden();
  await expect(
    page.getByText("Partially Paid", { exact: true }).first(),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Record Payment", exact: true })
    .click();
  const finalPayDialog = page.getByRole("dialog", { name: "Record Payment" });
  await expect(finalPayDialog.getByLabel("Amount *")).toHaveValue("120.00");
  await finalPayDialog
    .getByLabel("Payment Method *")
    .selectOption("bank_transfer");
  await finalPayDialog.getByLabel("Reference").fill("TRF-2");
  await finalPayDialog
    .getByRole("button", { name: "Submit Payment", exact: true })
    .click();
  await expect(finalPayDialog).toBeHidden();
  await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record Payment", exact: true }),
  ).toBeHidden();

  // Void second payment with reason -> Partially Paid
  const trfRow = page.getByRole("row", { name: /TRF-2/ });
  await trfRow.getByRole("button", { name: "Void", exact: true }).click();
  const voidTrfDialog = page.getByRole("dialog", { name: "Void Payment" });
  await voidTrfDialog.getByLabel("Void Reason *").fill("Mistyped transfer");
  await voidTrfDialog
    .getByRole("button", { name: "Confirm Void", exact: true })
    .click();
  await expect(voidTrfDialog).toBeHidden();
  await expect(
    page.getByText("Partially Paid", { exact: true }).first(),
  ).toBeVisible();
  await expect(trfRow.getByText(/Mistyped transfer/)).toBeVisible();

  // Attempt cancel while active payment exists -> error
  await page.getByRole("button", { name: "Cancel Order", exact: true }).click();
  const blockedCancelDialog = page.getByRole("dialog", {
    name: "Cancel Sales Order",
  });
  await blockedCancelDialog
    .getByLabel("Cancellation Reason *")
    .fill("Customer cancelled");
  await blockedCancelDialog
    .getByRole("button", { name: "Confirm Cancellation", exact: true })
    .click();
  await expect(
    blockedCancelDialog.getByText(
      "Void all active completed payments before cancelling this sales order.",
    ),
  ).toBeVisible();
  await blockedCancelDialog
    .getByRole("button", { name: "Keep Order", exact: true })
    .click();
  await expect(blockedCancelDialog).toBeHidden();

  // Void remaining payment -> Unpaid -> Cancel order -> verify inventory restored
  const rcptRow = page.getByRole("row", { name: /RCPT-1/ });
  await rcptRow.getByRole("button", { name: "Void", exact: true }).click();
  const voidRcptDialog = page.getByRole("dialog", { name: "Void Payment" });
  await voidRcptDialog.getByLabel("Void Reason *").fill("Order cancelled");
  await voidRcptDialog
    .getByRole("button", { name: "Confirm Void", exact: true })
    .click();
  await expect(voidRcptDialog).toBeHidden();
  await expect(page.getByText("Unpaid", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Cancel Order", exact: true }).click();
  const validCancelDialog = page.getByRole("dialog", {
    name: "Cancel Sales Order",
  });
  await validCancelDialog
    .getByLabel("Cancellation Reason *")
    .fill("Customer cancelled order");
  await validCancelDialog
    .getByRole("button", { name: "Confirm Cancellation", exact: true })
    .click();
  await expect(validCancelDialog).toBeHidden();
  await expect(
    page.getByText("Cancelled", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Reason: Customer cancelled order"),
  ).toBeVisible();

  await page.goto("/dashboard/inventory");
  await expect(
    page.getByRole("row", { name: /Industrial Valve.*10 pcs.*In Stock/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Industrial Valve.*Return In.*\+4 pcs/ }),
  ).toBeVisible();
});
