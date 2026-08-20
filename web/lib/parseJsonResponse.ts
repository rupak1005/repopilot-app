/** Parse JSON from a fetch response; null if the body is empty or HTML. */
export async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function apiUnreachableMessage(): string {
  return 'Could not reach the API on port 3001 — start it with yarn --cwd api dev.';
}
