import type { z } from "zod";
import type { AuthActionState } from "@/features/auth/types/auth-action-result";

export function zodErrorToActionState(error: z.ZodError): AuthActionState {
  return {
    status: "error",
    message: "Fix the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}
