import { childrenOf, generations, lifespan, parentNames, type Person } from "@/lib/family";

interface FamilyTreeProps {
  people: Person[];
}

export function FamilyTree({ people }: FamilyTreeProps) {
  const rows = generations(people);

  return (
    <div className="tree">
      {rows.map((row, depth) => (
        <section className="generation" key={depth}>
          <div className="gen-label">
            <span className="gen-num">{depth}</span>
            <span className="gen-count">
              {row.length} {row.length === 1 ? "person" : "people"}
            </span>
          </div>

          <ul className="cards">
            {row.map((person) => {
              const parents = parentNames(people, person);
              const childCount = childrenOf(people, person.id).length;

              return (
                <li className="card" key={person.id}>
                  <h2>{person.name}</h2>
                  <p className="years">{lifespan(person)}</p>
                  <dl className="rel">
                    <div>
                      <dt>Parents</dt>
                      <dd>{parents.length > 0 ? parents.join(" & ") : "—"}</dd>
                    </div>
                    <div>
                      <dt>Children</dt>
                      <dd>{childCount > 0 ? childCount : "—"}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
