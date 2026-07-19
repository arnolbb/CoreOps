export type AuthActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const idleAuthActionState: AuthActionState = {
  status: "idle",
};
