export function splitRepoFullName(fullName: string): { owner: string; name: string } {
  const slash = fullName.indexOf('/');
  if (slash === -1) return { owner: '', name: fullName };
  return { owner: fullName.slice(0, slash), name: fullName.slice(slash + 1) };
}
