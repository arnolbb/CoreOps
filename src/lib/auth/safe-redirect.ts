const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

export function getSafeRedirectPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "http://local.coreops");

    if (parsed.origin !== "http://local.coreops") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
