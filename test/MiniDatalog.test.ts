import { describe, test, expect } from "bun:test"
import { V, Eq, Neq, Or, And, naive_datalog, semi_naive_datalog, query, ask, type Rule, type Fact } from "../new_match/MiniDatalog"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sort facts for deterministic comparison. */
const sorted = (facts: Fact[]): Fact[] =>
    [...facts].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

/** Compare two fact sets regardless of order. */
const same_facts = (a: Fact[], b: Fact[]): boolean => {
    const sa = sorted(a).map(f => JSON.stringify(f))
    const sb = sorted(b).map(f => JSON.stringify(f))
    return sa.length === sb.length && sa.every((v, i) => v === sb[i])
}

/** Run both strategies and assert identical results. */
const both = (rules: Rule[], facts: Fact[], expected: Fact[]) => {
    const naive = naive_datalog(rules, facts)
    const semi  = semi_naive_datalog(rules, facts)
    expect(same_facts(naive, expected)).toBe(true)
    expect(same_facts(semi,  expected)).toBe(true)
}

// ─── No rules ─────────────────────────────────────────────────────────────────

describe("no rules", () => {
    test("returns EDB unchanged", () => {
        both([], [["edge", "a", "b"], ["edge", "b", "c"]], [
            ["edge", "a", "b"],
            ["edge", "b", "c"],
        ])
    })

    test("empty facts, empty rules → empty result", () => {
        both([], [], [])
    })
})

// ─── Single-step rules (no recursion) ─────────────────────────────────────────

describe("non-recursive rules", () => {
    test("copy rule: path(X,Y) :- edge(X,Y)", () => {
        const rules: Rule[] = [
            { head: ["path", V("X"), V("Y")], body: [["edge", V("X"), V("Y")]] },
        ]
        const facts: Fact[] = [["edge", "a", "b"], ["edge", "b", "c"]]
        both(rules, facts, [
            ["edge", "a", "b"], ["edge", "b", "c"],
            ["path", "a", "b"], ["path", "b", "c"],
        ])
    })

    test("rename predicate: foo(X) :- bar(X)", () => {
        const rules: Rule[] = [
            { head: ["foo", V("X")], body: [["bar", V("X")]] },
        ]
        const facts: Fact[] = [["bar", "1"], ["bar", "2"]]
        both(rules, facts, [
            ["bar", "1"], ["bar", "2"],
            ["foo", "1"], ["foo", "2"],
        ])
    })

    test("join rule: likes(X,Y) :- person(X), person(Y)", () => {
        const rules: Rule[] = [
            { head: ["likes", V("X"), V("Y")], body: [["person", V("X")], ["person", V("Y")]] },
        ]
        const facts: Fact[] = [["person", "alice"], ["person", "bob"]]
        const result = naive_datalog(rules, facts)
        // Every pair (alice,alice),(alice,bob),(bob,alice),(bob,bob)
        expect(result.filter(f => f[0] === "likes")).toHaveLength(4)
    })

    test("binary join: sibling(X,Y) :- parent(P,X), parent(P,Y)", () => {
        const rules: Rule[] = [
            {
                head: ["sibling", V("X"), V("Y")],
                body: [["parent", V("P"), V("X")], ["parent", V("P"), V("Y")]],
            },
        ]
        const facts: Fact[] = [
            ["parent", "alice", "bob"],
            ["parent", "alice", "charlie"],
        ]
        both(rules, facts, [
            ["parent", "alice", "bob"],
            ["parent", "alice", "charlie"],
            ["sibling", "bob",     "bob"],
            ["sibling", "bob",     "charlie"],
            ["sibling", "charlie", "bob"],
            ["sibling", "charlie", "charlie"],
        ])
    })

    test("rule with no matching facts derives nothing", () => {
        const rules: Rule[] = [
            { head: ["path", V("X"), V("Y")], body: [["edge", V("X"), V("Y")]] },
        ]
        const facts: Fact[] = [["node", "a"]]   // no edge facts
        both(rules, facts, [["node", "a"]])
    })

    test("constant head (fact-rule)", () => {
        const rules: Rule[] = [
            { head: ["alive", "alice"], body: [] },
        ]
        both(rules, [], [["alive", "alice"]])
    })
})

// ─── Transitive closure ───────────────────────────────────────────────────────

describe("transitive closure  path(X,Z) :- path(X,Y), edge(Y,Z)", () => {
    const rules: Rule[] = [
        { head: ["path", V("X"), V("Y")], body: [["edge", V("X"), V("Y")]] },
        {
            head: ["path", V("X"), V("Z")],
            body: [["path", V("X"), V("Y")], ["edge", V("Y"), V("Z")]],
        },
    ]

    test("three-node chain a→b→c→d", () => {
        const facts: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "b", "c"],
            ["edge", "c", "d"],
        ]
        both(rules, facts, [
            ["edge", "a", "b"], ["edge", "b", "c"], ["edge", "c", "d"],
            ["path", "a", "b"], ["path", "b", "c"], ["path", "c", "d"],
            ["path", "a", "c"], ["path", "b", "d"],
            ["path", "a", "d"],
        ])
    })

    test("single-edge graph", () => {
        const facts: Fact[] = [["edge", "x", "y"]]
        both(rules, facts, [["edge", "x", "y"], ["path", "x", "y"]])
    })

    test("two disconnected edges", () => {
        const facts: Fact[] = [["edge", "a", "b"], ["edge", "c", "d"]]
        both(rules, facts, [
            ["edge", "a", "b"], ["edge", "c", "d"],
            ["path", "a", "b"], ["path", "c", "d"],
        ])
    })

    test("naive and semi-naive agree on longer chain", () => {
        const facts: Fact[] = [
            ["edge", "1", "2"],
            ["edge", "2", "3"],
            ["edge", "3", "4"],
            ["edge", "4", "5"],
        ]
        const naive = naive_datalog(rules, facts)
        const semi  = semi_naive_datalog(rules, facts)
        expect(same_facts(naive, semi)).toBe(true)
        // 4 edges + 4+3+2+1 paths = 14 facts
        expect(naive).toHaveLength(14)
    })
})

// ─── Ancestor (IDB-on-IDB recursion) ─────────────────────────────────────────

describe("ancestor", () => {
    const rules: Rule[] = [
        { head: ["anc", V("X"), V("Y")], body: [["parent", V("X"), V("Y")]] },
        {
            head: ["anc", V("X"), V("Z")],
            body: [["anc", V("X"), V("Y")], ["parent", V("Y"), V("Z")]],
        },
    ]

    test("linear chain alice→bob→charlie", () => {
        const facts: Fact[] = [
            ["parent", "alice", "bob"],
            ["parent", "bob",   "charlie"],
        ]
        both(rules, facts, [
            ["parent",  "alice",   "bob"],
            ["parent",  "bob",     "charlie"],
            ["anc",     "alice",   "bob"],
            ["anc",     "bob",     "charlie"],
            ["anc",     "alice",   "charlie"],
        ])
    })

    test("branching family", () => {
        const facts: Fact[] = [
            ["parent", "gp",  "p1"],
            ["parent", "gp",  "p2"],
            ["parent", "p1",  "c1"],
        ]
        const naive = naive_datalog(rules, facts)
        const anc_facts = naive.filter(f => f[0] === "anc")
        // gp→p1, gp→p2, p1→c1, gp→c1
        expect(anc_facts).toHaveLength(4)
        expect(same_facts(naive, semi_naive_datalog(rules, facts))).toBe(true)
    })
})

// ─── Idempotence & consistency ────────────────────────────────────────────────

describe("idempotence", () => {
    test("re-running on the result produces no new facts", () => {
        const rules: Rule[] = [
            { head: ["path", V("X"), V("Y")], body: [["edge", V("X"), V("Y")]] },
        ]
        const facts: Fact[] = [["edge", "a", "b"]]
        const once  = naive_datalog(rules, facts)
        const twice = naive_datalog(rules, once)
        expect(same_facts(once, twice)).toBe(true)
    })

    test("naive === semi-naive on a join", () => {
        const rules: Rule[] = [
            {
                head: ["triple", V("X"), V("Y"), V("Z")],
                body: [["a", V("X"), V("Y")], ["b", V("Y"), V("Z")]],
            },
        ]
        const facts: Fact[] = [
            ["a", "1", "2"], ["a", "2", "3"],
            ["b", "2", "x"], ["b", "3", "y"],
        ]
        expect(same_facts(naive_datalog(rules, facts), semi_naive_datalog(rules, facts))).toBe(true)
    })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
    test("unary facts and rules", () => {
        const rules: Rule[] = [
            { head: ["reachable", V("X")], body: [["node", V("X")]] },
        ]
        const facts: Fact[] = [["node", "a"], ["node", "b"]]
        both(rules, facts, [
            ["node", "a"], ["node", "b"],
            ["reachable", "a"], ["reachable", "b"],
        ])
    })

    test("ternary facts", () => {
        const rules: Rule[] = [
            {
                head: ["connected", V("X"), V("Z"), V("M")],
                body: [["link", V("X"), V("M")], ["link", V("M"), V("Z")]],
            },
        ]
        const facts: Fact[] = [["link", "a", "hub"], ["link", "hub", "b"]]
        const result = naive_datalog(rules, facts)
        expect(result.find(f => JSON.stringify(f) === JSON.stringify(["connected", "a", "b", "hub"]))).toBeDefined()
    })

    test("rule whose head variables are all bound by body", () => {
        // head(X) :- a(X, Y), b(Y)  — Y must match but is not in head
        const rules: Rule[] = [
            {
                head: ["result", V("X")],
                body: [["a", V("X"), V("Y")], ["b", V("Y")]],
            },
        ]
        const facts: Fact[] = [
            ["a", "x1", "y1"], ["a", "x2", "y2"],
            ["b", "y1"],
        ]
        both(rules, facts, [
            ["a", "x1", "y1"], ["a", "x2", "y2"], ["b", "y1"],
            ["result", "x1"],
        ])
    })

    test("same variable appearing twice in body enforces equality", () => {
        // same(X) :- has(X, V), has(X, V)  — only if both values match
        const rules: Rule[] = [
            {
                head: ["same_val", V("X")],
                body: [["pair", V("X"), V("V")], ["pair", V("X"), V("V")]],
            },
        ]
        const facts: Fact[] = [
            ["pair", "a", "1"],
            ["pair", "b", "2"],
        ]
        const result = naive_datalog(rules, facts)
        const same_facts_r = result.filter(f => f[0] === "same_val")
        // Both a and b appear with their own consistent value
        expect(same_facts_r).toHaveLength(2)
    })
})

// ─── Builtins & compound clauses: Eq / Neq / Or / And ─────────────────────────

describe("builtins and compound clauses", () => {
    test("Eq binds a variable (p(X) :- edge(a,X), X = b)", () => {
        const rules: Rule[] = [
            { head: ["p", V("X")], body: [["edge", "a", V("X")], Eq(V("X"), "b")] },
        ]
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "a", "c"],
        ]

        both(rules, edb, [
            ["edge", "a", "b"],
            ["edge", "a", "c"],
            ["p", "b"],
        ])
    })

    test("Eq can enforce equality between two body variables (same(X,Y) :- edge(X,Y), X = Y)", () => {
        const rules: Rule[] = [
            { head: ["same", V("X"), V("Y")], body: [["edge", V("X"), V("Y")], Eq(V("X"), V("Y"))] },
        ]
        const edb: Fact[] = [
            ["edge", "a", "a"],
            ["edge", "a", "b"],
            ["edge", "b", "b"],
        ]

        both(rules, edb, [
            ["edge", "a", "a"],
            ["edge", "a", "b"],
            ["edge", "b", "b"],
            ["same", "a", "a"],
            ["same", "b", "b"],
        ])
    })

    test("Neq filters only when both sides are ground (ok(X) :- node(X), X != a)", () => {
        const rules: Rule[] = [
            { head: ["ok", V("X")], body: [["node", V("X")], Neq(V("X"), "a")] },
        ]
        const edb: Fact[] = [
            ["node", "a"],
            ["node", "b"],
            ["node", "c"],
        ]

        both(rules, edb, [
            ["node", "a"],
            ["node", "b"],
            ["node", "c"],
            ["ok", "b"],
            ["ok", "c"],
        ])
    })

    test("Neq on non-ground terms fails safely (no results) (bad(X) :- node(X), Y != a)", () => {
        // Y is never bound, so inequality is evaluated on a non-ground term and should fail (produce nothing).
        const rules: Rule[] = [
            { head: ["bad", V("X")], body: [["node", V("X")], Neq(V("Y"), "a")] },
        ]
        const edb: Fact[] = [
            ["node", "a"],
            ["node", "b"],
        ]

        both(rules, edb, [
            ["node", "a"],
            ["node", "b"],
        ])
    })

    test("Or supports alternative branches (p(X) :- edge(X) OR node(X))", () => {
        const rules: Rule[] = [
            {
                head: ["p", V("X")],
                body: [
                    Or(
                        [["edge", V("X")]],
                        [["node", V("X")]]
                    ),
                ],
            },
        ]
        const edb: Fact[] = [
            ["edge", "e1"],
            ["node", "n1"],
            ["node", "n2"],
        ]

        both(rules, edb, [
            ["edge", "e1"],
            ["node", "n1"],
            ["node", "n2"],
            ["p", "e1"],
            ["p", "n1"],
            ["p", "n2"],
        ])
    })

    test("And flattens premises, including inside Or branches", () => {
        const rules: Rule[] = [
            {
                head: ["p", V("X")],
                body: [
                    Or(
                        [And(["a", V("X")], ["b", V("X")])],
                        [And(["c", V("X")])],
                    ),
                ],
            },
        ]
        const edb: Fact[] = [
            ["a", "x1"],
            ["b", "x1"],
            ["a", "x2"],
            // missing b(x2)
            ["c", "x3"],
        ]

        both(rules, edb, [
            ["a", "x1"],
            ["b", "x1"],
            ["a", "x2"],
            ["c", "x3"],
            ["p", "x1"],
            ["p", "x3"],
        ])
    })
})

// ─── query() — enumerate bindings from a pattern ─────────────────────────────
//
// A graph:  a→b, a→c, b→c, c→d
//
//  a ──► b
//  │     │
//  ▼     ▼
//  c ◄───┘
//  │
//  ▼
//  d

describe("query — direct edge enumeration", () => {
    const graph: Fact[] = [
        ["edge", "a", "b"],
        ["edge", "a", "c"],
        ["edge", "b", "c"],
        ["edge", "c", "d"],
    ]

    test("all edges (both endpoints free)", () => {
        const bindings = query(["edge", V("From"), V("To")], graph)
        expect(bindings).toHaveLength(4)
        const pairs = bindings.map(d => [d.get("From"), d.get("To")])
        expect(pairs).toContainEqual(["a", "b"])
        expect(pairs).toContainEqual(["a", "c"])
        expect(pairs).toContainEqual(["b", "c"])
        expect(pairs).toContainEqual(["c", "d"])
    })

    test("all edges FROM a specific source", () => {
        const bindings = query(["edge", "a", V("To")], graph)
        expect(bindings).toHaveLength(2)
        const targets = bindings.map(d => d.get("To"))
        expect(targets).toContain("b")
        expect(targets).toContain("c")
    })

    test("all edges TO a specific target", () => {
        const bindings = query(["edge", V("From"), "c"], graph)
        expect(bindings).toHaveLength(2)
        const sources = bindings.map(d => d.get("From"))
        expect(sources).toContain("a")
        expect(sources).toContain("b")
    })

    test("specific edge — exists", () => {
        const bindings = query(["edge", "a", "b"], graph)
        expect(bindings).toHaveLength(1)
    })

    test("specific edge — does not exist", () => {
        const bindings = query(["edge", "a", "d"], graph)
        expect(bindings).toHaveLength(0)
    })

    test("edges between two specific nodes (both directions)", () => {
        // Check a→c and c→a
        const forward  = query(["edge", "a", "c"], graph)
        const backward = query(["edge", "c", "a"], graph)
        expect(forward).toHaveLength(1)
        expect(backward).toHaveLength(0)   // no reverse edge in this graph
    })
})

// ─── ask() — query over derived (IDB) facts ───────────────────────────────────

describe("ask — query derived paths in a graph", () => {
    const rules: Rule[] = [
        { head: ["path", V("X"), V("Y")], body: [["edge", V("X"), V("Y")]] },
        {
            head: ["path", V("X"), V("Z")],
            body: [["path", V("X"), V("Y")], ["edge", V("Y"), V("Z")]],
        },
    ]

    const edb: Fact[] = [
        ["edge", "a", "b"],
        ["edge", "b", "c"],
        ["edge", "c", "d"],
    ]

    test.only("all nodes reachable FROM a", () => {
        const result = ask(rules, edb, ["path", "a", V("Z")])
        const targets = result.map(f => f[2])
        expect(targets).toContain("b")
        expect(targets).toContain("c")
        expect(targets).toContain("d")
        expect(targets).toHaveLength(3)
    })

    test("all nodes that can REACH d", () => {
        const result = ask(rules, edb, ["path", V("X"), "d"])
        const sources = result.map(f => f[1])
        expect(sources).toContain("a")
        expect(sources).toContain("b")
        expect(sources).toContain("c")
        expect(sources).toHaveLength(3)
    })

    test("does a path exist between two given nodes", () => {
        expect(ask(rules, edb, ["path", "a", "d"])).toHaveLength(1)   // reachable
        expect(ask(rules, edb, ["path", "d", "a"])).toHaveLength(0)   // not reachable
    })

    test("all reachable pairs", () => {
        const result = ask(rules, edb, ["path", V("X"), V("Y")])
        // 3 direct + 2 two-hop + 1 three-hop = 6
        expect(result).toHaveLength(6)
    })
})

// ─── edges on path between two nodes ─────────────────────────────────────────
//
// Strategy: forward reachability from source + backward reachability from
// target.  An edge (X→Y) lies on a path from src to tgt iff X is fwd-reachable
// AND Y is bwd-reachable.
//
//   fwd(src).
//   fwd(Y) :- fwd(X), edge(X, Y).
//
//   bwd(tgt).
//   bwd(X) :- edge(X, Y), bwd(Y).
//
//   on_path(X, Y) :- edge(X, Y), fwd(X), bwd(Y).

function edges_on_path_rules(src: string, tgt: string): Rule[] {
    return [
        { head: ["fwd", src],    body: [] },
        { head: ["fwd", V("Y")], body: [["fwd", V("X")], ["edge", V("X"), V("Y")]] },
        { head: ["bwd", tgt],    body: [] },
        { head: ["bwd", V("X")], body: [["edge", V("X"), V("Y")], ["bwd", V("Y")]] },
        {
            head: ["on_path", V("X"), V("Y")],
            body: [["edge", V("X"), V("Y")], ["fwd", V("X")], ["bwd", V("Y")]],
        },
    ]
}

describe("edges on path between two nodes", () => {
    test("chain a→b→c→d: all three edges are on the path", () => {
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "b", "c"],
            ["edge", "c", "d"],
            ["edge", "a", "f"],
            ["edge", "f", "e"],
        ]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        const edges = result.map(f => [f[1], f[2]])
        expect(edges).toHaveLength(3)
        expect(edges).toContainEqual(["a", "b"])
        expect(edges).toContainEqual(["b", "c"])
        expect(edges).toContainEqual(["c", "d"])
    })

    test("diamond a→b, a→c, b→d, c→d: all four edges are on some path", () => {
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "a", "c"],
            ["edge", "b", "d"],
            ["edge", "c", "d"],
        ]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        const edges = result.map(f => [f[1], f[2]])
        expect(edges).toHaveLength(4)
        expect(edges).toContainEqual(["a", "b"])
        expect(edges).toContainEqual(["a", "c"])
        expect(edges).toContainEqual(["b", "d"])
        expect(edges).toContainEqual(["c", "d"])
    })

    test("dead-end branch b→z is excluded", () => {
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "b", "c"],
            ["edge", "c", "d"],
            ["edge", "b", "z"],   // dead end: z cannot reach d
        ]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        const edges = result.map(f => [f[1], f[2]])
        expect(edges).toHaveLength(3)
        expect(edges).toContainEqual(["a", "b"])
        expect(edges).toContainEqual(["b", "c"])
        expect(edges).toContainEqual(["c", "d"])
        expect(edges).not.toContainEqual(["b", "z"])
    })

    test("no path between nodes returns empty", () => {
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "c", "d"],   // disconnected component
        ]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        expect(result).toHaveLength(0)
    })

    test("single direct edge a→d", () => {
        const edb: Fact[] = [["edge", "a", "d"]]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        expect(result.map(f => [f[1], f[2]])).toContainEqual(["a", "d"])
        expect(result).toHaveLength(1)
    })

    // ── Cycles ────────────────────────────────────────────────────────────────
    //
    // Datalog's fixpoint evaluation handles cycles safely: facts are stored in
    // a set, so even when an edge loops back to a visited node the derivation
    // simply produces a fact that already exists and the iteration terminates.

    test("cycle back to source: a→b→c→a, a→d", () => {
        // The path a→b→c→a→d uses all four edges.
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "b", "c"],
            ["edge", "c", "a"],   // cycle back to source
            ["edge", "a", "d"],
        ]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        const edges = result.map(f => [f[1], f[2]])
        expect(edges).toHaveLength(4)
        expect(edges).toContainEqual(["a", "b"])
        expect(edges).toContainEqual(["b", "c"])
        expect(edges).toContainEqual(["c", "a"])
        expect(edges).toContainEqual(["a", "d"])
    })

    test("mid-path cycle: a→b↔c→d", () => {
        // b and c form a cycle; path a→b→c→d (or a→b→c→b→c→d) — both b→c and c→b are on valid paths.
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "b", "c"],
            ["edge", "c", "b"],   // cycle between b and c
            ["edge", "c", "d"],
        ]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        const edges = result.map(f => [f[1], f[2]])
        expect(edges).toHaveLength(4)
        expect(edges).toContainEqual(["a", "b"])
        expect(edges).toContainEqual(["b", "c"])
        expect(edges).toContainEqual(["c", "b"])  // on path a→b→c→b→c→d
        expect(edges).toContainEqual(["c", "d"])
    })

    test("self-loop on source: a→a, a→b", () => {
        // a loops to itself; path a→a→b uses both edges.
        const edb: Fact[] = [
            ["edge", "a", "a"],   // self-loop
            ["edge", "a", "b"],
        ]
        const result = ask(edges_on_path_rules("a", "b"), edb, ["on_path", V("X"), V("Y")])
        const edges = result.map(f => [f[1], f[2]])
        expect(edges).toHaveLength(2)
        expect(edges).toContainEqual(["a", "a"])
        expect(edges).toContainEqual(["a", "b"])
    })

    test("cycle that does not reach target is excluded", () => {

        // a→b→c→b is a cycle that never reaches d; only a→d should be on_path.
        const edb: Fact[] = [
            ["edge", "a", "b"],
            ["edge", "b", "c"],
            ["edge", "c", "b"],   // cycle, neither b nor c reach d
            ["edge", "a", "d"],
        ]
        const result = ask(edges_on_path_rules("a", "d"), edb, ["on_path", V("X"), V("Y")])
        const edges = result.map(f => [f[1], f[2]])
        expect(edges).toHaveLength(1)
        expect(edges).toContainEqual(["a", "d"])
        expect(edges).not.toContainEqual(["a", "b"])
        expect(edges).not.toContainEqual(["b", "c"])
        expect(edges).not.toContainEqual(["c", "b"])
    })
})
