// PrivateRoute sends a logged-out visitor to /login with state = { from: <the page they wanted> }.
// This reads that back and returns where to go after login ("/" when there is nothing).
export function getRedirectTarget(state: unknown): string {
  const fromState = state as { from?: { pathname?: string; search?: string } } | null;
  const pathname = fromState?.from?.pathname;

  // Only same-site paths: a value like "//evil.com" would leave the site
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return "/";
  }

  return pathname + (fromState?.from?.search ?? "");
}
