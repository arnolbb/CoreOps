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
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Check your email to confirm your account."),
  ).toBeVisible();

  const confirmationLink = await waitForSignupLink(email);
  await page.goto(confirmationLink);
  await expect(page).toHaveURL(/\/onboarding\/organization$/);
}

async function createOrganization(page: Page, name: string, slug: string) {
  await page.getByLabel("Organization name").fill(name);
  await page.getByLabel("Organization address").fill(slug);
  await page.getByLabel("Business type").selectOption("general");
  await page.getByLabel("Timezone").selectOption("Asia/Jakarta");
  await page.getByLabel("Currency").selectOption("USD");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
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

function seedSalesAndWorkOrder({
  email,
  slug,
  customerName,
  productSku,
  warehouseCode,
}: {
  email: string;
  slug: string;
  customerName: string;
  productSku: string;
  warehouseCode: string;
}) {
  const sql = `
    DO $$
    DECLARE
      v_org_id uuid;
      v_user_id uuid;
      v_customer_id uuid;
      v_warehouse_id uuid;
      v_product_id uuid;
      v_order_id uuid;
    BEGIN
      SELECT id INTO v_org_id FROM public.organizations WHERE slug = ${sqlLiteral(slug)};
      SELECT id INTO v_user_id FROM auth.users WHERE email = ${sqlLiteral(email)};
      SELECT id INTO v_customer_id
      FROM public.customers
      WHERE organization_id = v_org_id AND display_name = ${sqlLiteral(customerName)};
      SELECT id INTO v_warehouse_id
      FROM public.warehouses
      WHERE organization_id = v_org_id AND code = ${sqlLiteral(warehouseCode)};
      SELECT id INTO v_product_id
      FROM public.products
      WHERE organization_id = v_org_id AND sku = ${sqlLiteral(productSku)};

      PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
      PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object('sub', v_user_id::text, 'role', 'authenticated')::text,
        true
      );

      EXECUTE 'SET LOCAL ROLE authenticated';

      SELECT r.sales_order_id INTO v_order_id
      FROM public.create_sales_order_draft(
        p_customer_id => v_customer_id,
        p_items => jsonb_build_array(
          jsonb_build_object(
            'product_id', v_product_id,
            'quantity', 2
          )
        ),
        p_order_number => null,
        p_warehouse_id => v_warehouse_id,
        p_notes => 'Dashboard E2E confirmed order'
      ) AS r;

      PERFORM public.confirm_sales_order(
        p_sales_order_id => v_order_id,
        p_warehouse_id => v_warehouse_id
      );

      PERFORM public.record_sales_payment(
        p_sales_order_id => v_order_id,
        p_amount => 75.00,
        p_payment_method => 'bank_transfer',
        p_paid_at => now(),
        p_reference => 'TRX-DSH-01',
        p_notes => 'Partial payment'
      );

      PERFORM public.create_work_order(
        p_organization_id => v_org_id,
        p_customer_id => v_customer_id,
        p_work_type => 'installation',
        p_description => 'Initial equipment installation',
        p_priority => 'high',
        p_status => 'scheduled',
        p_customer_address_id => null,
        p_assigned_to => v_user_id,
        p_scheduled_start => now() + interval '2 hours',
        p_scheduled_end => now() + interval '4 hours'
      );
    END $$;
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

test("dashboard displays onboarding guidance when empty and live KPIs once operational data exists", async ({
  page,
}) => {
  const uniqueId = Date.now();
  const email = `dashboard-owner-${uniqueId}@example.test`;
  const password = "password123";
  const slug = `dashboard-org-${uniqueId}`;
  const customerName = "Acme Hospitality";

  await registerAndConfirm(page, email, password);
  await createOrganization(page, "Dashboard Ops Org", slug);
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Organization setup is complete.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Add Customers/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Add Products/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Set Up Inventory/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Record Sales/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Schedule Work Orders/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers$/);
  await page.getByRole("button", { name: "Add Customer", exact: true }).click();
  const customerDialog = page.getByRole("dialog", {
    name: "Add Customer",
    exact: true,
  });
  await expect(customerDialog).toBeVisible();
  await customerDialog.getByLabel("Display Name *").fill(customerName);
  await customerDialog
    .getByRole("button", { name: "Create Customer", exact: true })
    .click();
  await expect(customerDialog).toBeHidden();
  await expect(page.getByRole("table").getByText(customerName)).toBeVisible();

  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await page.getByRole("button", { name: "Add Product", exact: true }).click();
  const productDialog = page.getByRole("dialog", {
    name: "Add Product",
    exact: true,
  });
  await expect(productDialog).toBeVisible();
  await productDialog.getByLabel("Product Type").selectOption("goods");
  await productDialog.getByLabel("Product Name *").fill("Replacement Valve");
  await productDialog.getByLabel("SKU").fill("VALVE-01");
  await productDialog.getByLabel("Unit *").fill("pcs");
  await productDialog.getByLabel("Selling Price *").fill("100");
  await productDialog.getByLabel("Cost Price").fill("40");
  await productDialog.getByLabel("Minimum Stock").fill("15");
  await productDialog
    .getByRole("button", { name: "Create Product", exact: true })
    .click();
  await expect(productDialog).toBeHidden();

  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/inventory$/);
  await page.getByRole("button", { name: "Warehouses", exact: true }).click();
  const warehousesDialog = page.getByRole("dialog", {
    name: "Manage Warehouses",
    exact: true,
  });
  await expect(warehousesDialog).toBeVisible();
  await warehousesDialog.getByLabel("Warehouse Name *").fill("Main Warehouse");
  await warehousesDialog.getByLabel("Warehouse Code *").fill("WH-01");
  await warehousesDialog
    .getByRole("button", { name: "Add Warehouse", exact: true })
    .click();
  await expect(warehousesDialog.getByText("WH-01")).toBeVisible();
  await warehousesDialog
    .getByRole("button", { name: "Close warehouses dialog", exact: true })
    .click();
  await expect(warehousesDialog).toBeHidden();

  await page.getByRole("button", { name: "Adjust Stock", exact: true }).click();
  const adjustDialog = page.getByRole("dialog", {
    name: "Adjust Stock",
    exact: true,
  });
  await expect(adjustDialog).toBeVisible();
  await adjustDialog.getByLabel("Warehouse *").selectOption({
    label: "Main Warehouse (WH-01)",
  });
  await adjustDialog.getByLabel("Product *").selectOption({
    label: "Replacement Valve (VALVE-01)",
  });
  await adjustDialog
    .getByLabel("Adjustment Type *")
    .selectOption("opening_stock");
  await adjustDialog.getByLabel("Quantity *").fill("12");
  await adjustDialog.getByLabel(/Reason/).fill("Opening inventory count");
  await adjustDialog
    .getByRole("button", { name: "Apply Adjustment", exact: true })
    .click();
  await expect(adjustDialog).toBeHidden();

  seedSalesAndWorkOrder({
    email,
    slug,
    customerName,
    productSku: "VALVE-01",
    warehouseCode: "WH-01",
  });

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Organization setup is complete.")).toHaveCount(
    0,
  );

  await expect(
    page.getByRole("link", { name: /Total Customers.*1/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Sales This Month.*\$200\.00.*1 order/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Outstanding Payments.*\$125\.00.*1 unpaid or partial order/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Low-Stock Products.*1/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Active Work Orders.*1/ }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Low-Stock Alerts", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Replacement Valve (VALVE-01)")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Active Work Orders", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(new RegExp(`WO-\\d{4}-0001 · ${customerName}`)),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Recent Activity", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Created a work order")).toBeVisible();
  await expect(page.getByText("Recorded a sales payment")).toBeVisible();
  await expect(page.getByText("Confirmed a sales order")).toBeVisible();
  await expect(page.getByText("Adjusted inventory stock")).toBeVisible();
  await expect(page.getByText(/Asia\/Jakarta/).first()).toBeVisible();
});
