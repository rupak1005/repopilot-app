/** When true, dashboard pages use local fixtures instead of API calls. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}
