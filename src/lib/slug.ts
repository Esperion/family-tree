/** Words that collide with real routes under /f/ and must not become a slug. */
const RESERVED = new Set(["new", "signin", "api", "f"]);

/** A URL-safe slug: lowercase, ASCII, words joined by single hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD") // "é" -> "e" + U+0301
    .replace(/[̀-ͯ]/g, "") // drop the combining marks NFKD produced
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** slugify, then guarantee it is non-empty and not a reserved word. */
export function safeSlug(input: string): string {
  const s = slugify(input);
  if (!s || RESERVED.has(s)) return `${s || "family"}-1`;
  return s;
}
