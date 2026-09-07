/** Pure helpers for the comma-separated "also known as" field. */

const MAX_ALIASES = 20;

/** "Maiden, Nickname , Nickname" -> ["Maiden", "Nickname"] (trimmed, deduped). */
export function parseAliases(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(",")) {
    const value = raw.trim();
    if (value) seen.add(value);
  }
  return [...seen].slice(0, MAX_ALIASES);
}

export function formatAliases(aliases: string[]): string {
  return aliases.join(", ");
}
