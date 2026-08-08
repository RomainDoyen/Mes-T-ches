/**
 * Deterministic Appwrite row id for a task↔tag link.
 * Appwrite UIDs: ≤36 chars, [a-zA-Z0-9_], no leading underscore.
 */
export function taskTagEntityId(taskId: string, tagId: string): string {
  return `tt_${fnvHex(`${taskId}\0${tagId}`, 32)}`;
}

/** FNV-1a over the string, expanded to `hexLen` hex chars (0-9a-f). */
function fnvHex(input: string, hexLen: number): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  let h3 = 0x811c9dc5 ^ 0x85ebca6b;
  let h4 = 0x811c9dc5 ^ 0xc2b2ae35;

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x01000193);
    h3 = Math.imul(h3 ^ c, 0x01000193);
    h4 = Math.imul(h4 ^ c, 0x01000193);
    // mix positions so order matters strongly
    h2 = Math.imul(h2 ^ (c << (i % 7)), 0x85ebca6b);
    h3 = Math.imul(h3 ^ (i * c), 0xc2b2ae35);
  }

  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${part(h1)}${part(h2)}${part(h3)}${part(h4)}`.slice(0, hexLen);
}
