import { z } from "zod";
import {
  WORK_ORDER_ALLOWED_MIME_TYPES,
  WORK_ORDER_ATTACHMENT_TYPES,
  WORK_ORDER_MAX_ATTACHMENT_BYTES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_TYPES,
} from "../types/work-order";

function optionalUuidField(errorMessage: string) {
  return z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (!value ? null : value))
    .refine(
      (value) => value === null || z.string().uuid().safeParse(value).success,
      errorMessage,
    );
}

function optionalDatetimeField(errorMessage: string) {
  return z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (!value ? null : value))
    .refine(
      (value) => value === null || !Number.isNaN(Date.parse(value)),
      errorMessage,
    )
    .transform((value) => (value ? new Date(value).toISOString() : null));
}

export const workOrderFormSchema = z
  .object({
    customerId: z.string().uuid("Select a valid customer"),
    customerAddressId: optionalUuidField("Select a valid customer address"),
    workType: z.enum(WORK_ORDER_TYPES, {
      message: "Select a valid work type",
    }),
    priority: z
      .enum(WORK_ORDER_PRIORITIES, {
        message: "Select a valid priority",
      })
      .default("normal"),
    initialStatus: z
      .enum(["draft", "scheduled"], {
        message: "Initial status must be draft or scheduled",
      })
      .optional()
      .default("draft"),
    assignedTo: optionalUuidField("Select a valid assignee"),
    scheduledStart: optionalDatetimeField("Enter a valid scheduled start time"),
    scheduledEnd: optionalDatetimeField("Enter a valid scheduled end time"),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(5000, "Description must be at most 5000 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.scheduledStart && data.scheduledEnd) {
      if (
        new Date(data.scheduledEnd).getTime() <
        new Date(data.scheduledStart).getTime()
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledEnd"],
          message: "Scheduled end cannot be before scheduled start",
        });
      }
    }
  });

export type WorkOrderFormValues = z.input<typeof workOrderFormSchema>;
export type WorkOrderFormParsedValues = z.output<typeof workOrderFormSchema>;

export const transitionWorkOrderStatusSchema = z
  .object({
    workOrderId: z.string().uuid("Invalid work order identifier"),
    targetStatus: z.enum(WORK_ORDER_STATUSES, {
      message: "Invalid target status",
    }),
    completionNotes: z
      .string()
      .trim()
      .max(5000, "Completion notes must be at most 5000 characters")
      .nullable()
      .optional()
      .transform((value) => (!value ? null : value)),
    cancellationReason: z
      .string()
      .trim()
      .max(2000, "Cancellation reason must be at most 2000 characters")
      .nullable()
      .optional()
      .transform((value) => (!value ? null : value)),
  })
  .superRefine((data, ctx) => {
    if (data.targetStatus === "completed" && !data.completionNotes) {
      ctx.addIssue({
        code: "custom",
        path: ["completionNotes"],
        message: "Completion notes are required to complete a work order",
      });
    }

    if (data.targetStatus === "cancelled" && !data.cancellationReason) {
      ctx.addIssue({
        code: "custom",
        path: ["cancellationReason"],
        message: "Cancellation reason is required to cancel a work order",
      });
    }
  });

export type TransitionWorkOrderStatusValues = z.input<
  typeof transitionWorkOrderStatusSchema
>;

export const reopenWorkOrderSchema = z.object({
  workOrderId: z.string().uuid("Invalid work order identifier"),
  reason: z
    .string()
    .trim()
    .min(1, "Reopen reason is required")
    .max(2000, "Reopen reason must be at most 2000 characters"),
});

export type ReopenWorkOrderValues = z.input<typeof reopenWorkOrderSchema>;

export const workOrderItemUsageSchema = z.object({
  workOrderId: z.string().uuid("Invalid work order identifier"),
  warehouseId: z.string().uuid("Select a valid warehouse"),
  productId: z.string().uuid("Select a valid product"),
  quantity: z
    .number({ message: "Quantity must be a number" })
    .positive("Quantity must be greater than zero")
    .max(1000000000, "Quantity is too large"),
  idempotencyKey: z
    .string()
    .trim()
    .max(128, "Idempotency key too long")
    .nullable()
    .optional()
    .transform((value) => (!value ? null : value)),
});

export type WorkOrderItemUsageValues = z.input<typeof workOrderItemUsageSchema>;

export const workOrderAttachmentMetaSchema = z.object({
  workOrderId: z.string().uuid("Invalid work order identifier"),
  attachmentType: z.enum(WORK_ORDER_ATTACHMENT_TYPES, {
    message: "Select a valid attachment type",
  }),
  fileName: z
    .string()
    .trim()
    .min(1, "File name is required")
    .max(255, "File name must be at most 255 characters"),
  mimeType: z.enum(WORK_ORDER_ALLOWED_MIME_TYPES, {
    message: "Unsupported file type. Upload JPEG, PNG, WebP, or PDF.",
  }),
  sizeBytes: z
    .number({ message: "Invalid file size" })
    .int("Invalid file size")
    .positive("File cannot be empty")
    .max(WORK_ORDER_MAX_ATTACHMENT_BYTES, "File size must be 10 MB or less"),
});

export type WorkOrderAttachmentMetaValues = z.input<
  typeof workOrderAttachmentMetaSchema
>;

export function sanitizeAttachmentFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? "";
  const replaced = baseName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[-_.]+|[-_.]+$/g, "");
  const truncated = replaced.slice(0, 120);

  return truncated.length > 0 ? truncated : "attachment";
}
