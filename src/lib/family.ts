/**
 * Domain model for the family tree.
 *
 * A person records only their own parents. Everything else - children,
 * generations, ancestry - is derived, so the seed data has a single source of
 * truth and cannot contradict itself.
 */

export interface Person {
  id: string;
  name: string;
  birthYear?: number;
  deathYear?: number;
  /** Ids of this person's parents. Empty for founders and people who married in. */
  parents: string[];
  /** Display-only extras, populated from the database (never in the seed fixture). */
  aliases?: string[];
  photoUrl?: string | null;
  gender?: string | null;
  notes?: string | null;
}

export const family: Person[] = [
  { id: "tomas", name: "Tomas Meyer", birthYear: 1898, deathYear: 1969, parents: [] },
  { id: "alina", name: "Alina Meyer", birthYear: 1901, deathYear: 1978, parents: [] },
  { id: "erik", name: "Erik Roth", birthYear: 1927, deathYear: 1998, parents: [] },
  { id: "helena", name: "Helena Vogt", birthYear: 1934, deathYear: 2019, parents: [] },

  { id: "ruth", name: "Ruth Meyer", birthYear: 1929, deathYear: 2011, parents: ["tomas", "alina"] },
  { id: "peter", name: "Peter Meyer", birthYear: 1932, deathYear: 2004, parents: ["tomas", "alina"] },

  { id: "daniel", name: "Daniel Roth", birthYear: 1955, parents: ["erik", "ruth"] },
  { id: "klara", name: "Klara Roth", birthYear: 1958, parents: ["erik", "ruth"] },
  { id: "martin", name: "Martin Meyer", birthYear: 1958, parents: ["peter", "helena"] },
  { id: "sofia", name: "Sofia Meyer", birthYear: 1961, parents: ["peter", "helena"] },

  { id: "nina", name: "Nina Roth", birthYear: 1987, parents: ["daniel"] },
  { id: "lukas", name: "Lukas Meyer", birthYear: 1990, parents: ["martin"] },
  { id: "mia", name: "Mia Meyer", birthYear: 1993, parents: ["martin"] },
];

/** Index people by id for O(1) lookup. */
export function byId(people: Person[]): Map<string, Person> {
  return new Map(people.map((person) => [person.id, person]));
}

/** Everyone who lists `id` as a parent. */
export function childrenOf(people: Person[], id: string): Person[] {
  return people.filter((person) => person.parents.includes(id));
}

/** People with no recorded parents - founders and those who married in. */
export function rootsOf(people: Person[]): Person[] {
  return people.filter((person) => person.parents.length === 0);
}

/** Every ancestor of `id`, breadth-first, each returned once. */
export function ancestorsOf(people: Person[], id: string): Person[] {
  const index = byId(people);
  const seen = new Set<string>();
  const found: Person[] = [];
  const queue = [...(index.get(id)?.parents ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);

    const person = index.get(current);
    if (!person) continue;

    found.push(person);
    queue.push(...person.parents);
  }

  return found;
}

/** Every descendant of `id`, breadth-first, each returned once. */
export function descendantsOf(people: Person[], id: string): Person[] {
  const index = byId(people);
  const seen = new Set<string>();
  const found: Person[] = [];
  const queue = childrenOf(people, id).map((person) => person.id);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);

    const person = index.get(current);
    if (!person) continue;

    found.push(person);
    queue.push(...childrenOf(people, current).map((child) => child.id));
  }

  return found;
}

/**
 * How many generations separate this person from the earliest ancestor on
 * their deepest line. Founders are generation 0. Cyclic data terminates
 * rather than recursing forever.
 */
export function generationOf(people: Person[], id: string): number {
  const index = byId(people);
  const cache = new Map<string, number>();

  const walk = (current: string, trail: Set<string>): number => {
    const cached = cache.get(current);
    if (cached !== undefined) return cached;
    if (trail.has(current)) return 0;

    const person = index.get(current);
    if (!person || person.parents.length === 0) {
      cache.set(current, 0);
      return 0;
    }

    const nextTrail = new Set(trail).add(current);
    const depth = 1 + Math.max(...person.parents.map((parent) => walk(parent, nextTrail)));
    cache.set(current, depth);
    return depth;
  };

  return walk(id, new Set());
}

/** Everyone grouped into generation rows, oldest first. */
export function generations(people: Person[]): Person[][] {
  const measured = people.map((person) => ({
    person,
    depth: generationOf(people, person.id),
  }));

  const deepest = measured.reduce((max, entry) => Math.max(max, entry.depth), 0);

  return Array.from({ length: deepest + 1 }, (_, depth) =>
    measured.filter((entry) => entry.depth === depth).map((entry) => entry.person),
  );
}

/** "1898 – 1969" for the departed, "b. 1955" for the living. */
export function lifespan(person: Person): string {
  const birth = person.birthYear ? String(person.birthYear) : "?";
  return person.deathYear ? `${birth} – ${person.deathYear}` : `b. ${birth}`;
}

/** Resolved names of a person's parents, skipping any unknown ids. */
export function parentNames(people: Person[], person: Person): string[] {
  const index = byId(people);
  return person.parents
    .map((parentId) => index.get(parentId)?.name)
    .filter((name): name is string => Boolean(name));
}
