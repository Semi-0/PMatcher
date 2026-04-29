// SPDX-License-Identifier: GPL-3.0-or-later
//
// Copyright (c) 2024–2026 semi-0
//
// Mini-Datalog engine built on top of the new_match unification engine.
//
// Two evaluation strategies are provided:
//
//   naive_datalog   – classic bottom-up fixpoint; re-evaluates all rules
//                     against the full fact set each round.
//
//   semi_naive_datalog – only uses facts that are *new* in the previous
//                        round for at least one body literal; avoids
//                        re-deriving facts that were already known.
//
// Body atoms can be:
//
//   • regular fact atoms  – ["predicate", arg, …]
//   • Eq(a, b)            – succeeds when a unifies with b (equality)
//   • Neq(a, b)           – succeeds when a and b are ground and differ
//   • And(...atoms)       – explicit conjunction; equivalent to listing the
//                           atoms flat in the body
//   • Or(...branches)     – disjunction; each branch is an independent list
//                           of body atoms
//
// Variables in rule atoms are created with the `V(name)` helper, which
// wraps a name as a P.element pattern understood by Unification.ts.
//
// Usage example:
//
//   import { V, Eq, Neq, Or, And, semi_naive_datalog, type Rule } from "./MiniDatalog"
//
//   const rules: Rule[] = [
//     { head: ["path", V("X"), V("Y")], body: [["edge", V("X"), V("Y")]] },
//     { head: ["path", V("X"), V("Z")], body: [["path", V("X"), V("Y")], ["edge", V("Y"), V("Z")]] },
//   ]
//   const facts: Fact[] = [["edge","a","b"], ["edge","b","c"]]
//
//   semi_naive_datalog(rules, facts)
//   // => [["edge","a","b"],["edge","b","c"],["path","a","b"],["path","b","c"],["path","a","c"]]

import { P, is_match_element } from "../MatchBuilder"
import {
    unify_internal,
    match_dict_substitute,
    empty_dict,
    type UnifyDict,
} from "./Unification"

// ─── Public Types ─────────────────────────────────────────────────────────────

/** A ground (fully-concrete) tuple, e.g. `["edge", "a", "b"]`. */
export type Fact = string[]

/**
 * An atom that may contain variable terms created with `V()`.
 * e.g. `["edge", V("X"), V("Y")]`
 */
export type Atom = any[]

/** Built-in equality constraint: succeeds when `a` unifies with `b`. */
export type BuiltinEq  = ["=",  any, any]

/** Built-in inequality constraint: succeeds when `a` and `b` are ground and differ. */
export type BuiltinNeq = ["!=", any, any]

/**
 * Disjunction: at least one branch must be satisfiable.
 * Each branch is a list of body atoms (a conjunction).
 */
export interface OrClause  { or:  BodyAtom[][] }

/**
 * Explicit conjunction: equivalent to listing the atoms flat in the body.
 * Useful for grouping inside an `Or` branch.
 */
export interface AndClause { and: BodyAtom[] }

/**
 * Constraint atom: a named, non-relation constraint over terms.
 * The initial built-in protocol supports finite-domain membership via
 * `Constraint("fd/member", term, values)`.
 */
export interface ConstraintClause {
    tag: "constraint"
    name: string
    args: readonly any[]
}

/** A body atom: regular fact atom, built-in constraint, or compound clause. */
export type BodyAtom = Atom | BuiltinEq | BuiltinNeq | OrClause | AndClause | ConstraintClause

/** A Datalog rule: a head atom and zero or more body atoms. */
export interface Rule {
    head: Atom
    body: BodyAtom[]
}

// ─── Variable & Clause Helpers ────────────────────────────────────────────────

/**
 * Create a Datalog variable: `V("X")` produces a `[P.element, "X"]` pattern
 * that the unification engine treats as a bindable element variable.
 */
export const V = (name: string): any[] => [P.element, name]

/**
 * Equality constraint: `Eq(a, b)` succeeds when `a` unifies with `b`.
 * If one side is a variable, it is bound to the other.
 *
 * @example
 * // Only self-loops: edge(X, X)
 * { head: ["self_loop", V("X")], body: [["edge", V("X"), V("Y")], Eq(V("X"), V("Y"))] }
 */
export const Eq = (a: any, b: any): BuiltinEq => ["=", a, b]

/**
 * Inequality constraint: `Neq(a, b)` succeeds when both sides are ground
 * and not equal.  Fails safely (returns no results) if either side is still
 * an unbound variable.
 *
 * @example
 * // Edges between distinct nodes
 * { head: ["distinct_edge", V("X"), V("Y")], body: [["edge", V("X"), V("Y")], Neq(V("X"), V("Y"))] }
 */
export const Neq = (a: any, b: any): BuiltinNeq => ["!=", a, b]

/**
 * Explicit disjunction: `Or(branch1, branch2, …)` succeeds when at least
 * one branch succeeds.  Each branch is a `BodyAtom[]`.
 *
 * Equivalent to writing multiple rules with the same head, but can be
 * expressed inline in a single rule body.
 *
 * @example
 * // reachable(X, Y) :- edge(X, Y) OR road(X, Y)
 * { head: ["reachable", V("X"), V("Y")],
 *   body: [Or([["edge", V("X"), V("Y")]], [["road", V("X"), V("Y")]])] }
 */
export const Or = (...branches: BodyAtom[][]): OrClause => ({ or: branches })

/**
 * Explicit conjunction: `And(a, b, …)` is equivalent to listing `a, b, …`
 * flat in the body.  Useful for grouping inside an `Or` branch.
 *
 * @example
 * Or(
 *   [And(["edge", V("X"), V("Y")], Neq(V("X"), "root"))],
 *   [["shortcut", V("X"), V("Y")]]
 * )
 */
export const And = (...clauses: BodyAtom[]): AndClause => ({ and: clauses })

export const Constraint = (name: string, ...args: any[]): ConstraintClause => ({
    tag: "constraint",
    name,
    args,
})

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** True when no pattern variable appears anywhere in `x`. */
const is_ground = (x: any): boolean => {
    if (is_match_element(x)) return false
    if (Array.isArray(x)) return x.every(is_ground)
    return true
}

/** Structural equality for ground facts. */
const fact_equal = (a: Fact, b: Fact): boolean =>
    a.length === b.length && a.every((v, i) => v === b[i])

/** Add `fact` to `set` if not already present; returns true on insertion. */
const add_if_new = (set: Fact[], fact: Fact): boolean => {
    if (set.some(f => fact_equal(f, fact))) return false
    set.push(fact)
    return true
}

/**
 * Apply the substitution `dict` to `atom`; return a ground Fact or `false`
 * when the atom still contains unbound variables.
 */
export const ground = (atom: Atom, dict: UnifyDict): Fact | false => {
    const result = match_dict_substitute(dict)(atom)
    return is_ground(result) ? (result as Fact) : false
}

/**
 * Attempt to unify `premise` (a possibly-variable atom) with `fact` (a ground
 * atom), extending `dict`.  Returns the new dict or `false` on failure.
 */
const unify_premise = (premise: Atom, fact: Fact, dict: UnifyDict): UnifyDict | false => {
    const result = unify_internal(premise, fact, dict, d => d)
    return result !== false && result !== undefined ? (result as UnifyDict) : false
}

// ─── Body Atom Type Guards ────────────────────────────────────────────────────

const is_eq  = (a: BodyAtom): a is BuiltinEq  =>
    Array.isArray(a) && a.length === 3 && a[0] === "="

const is_neq = (a: BodyAtom): a is BuiltinNeq =>
    Array.isArray(a) && a.length === 3 && a[0] === "!="

const is_or  = (a: BodyAtom): a is OrClause =>
    a !== null && !Array.isArray(a) && typeof a === "object" && "or" in a

const is_and = (a: BodyAtom): a is AndClause =>
    a !== null && !Array.isArray(a) && typeof a === "object" && "and" in a

const is_constraint = (a: BodyAtom): a is ConstraintClause =>
    a !== null && !Array.isArray(a) && typeof a === "object" && (a as any).tag === "constraint"

const solve_constraint = (constraint: ConstraintClause, dict: UnifyDict): UnifyDict[] => {
    if (constraint.name === "fd/member" || constraint.name === "fd-member" || constraint.name === "one-of") {
        const [term, values] = constraint.args
        const domain = Array.isArray(values) ? values : []
        const results: UnifyDict[] = []
        const substituted = match_dict_substitute(dict)(term)
        for (const value of domain) {
            const next = unify_internal(substituted, value, dict, d => d)
            if (next !== false && next !== undefined) results.push(next as UnifyDict)
        }
        return results
    }

    throw new Error(`unknown Datalog constraint: ${constraint.name}`)
}

// ─── Normalization (for semi-naive) ──────────────────────────────────────────
//
// Semi-naive evaluation needs to know which body positions are *relation
// literals* (predicate calls matched against stored facts — eligible for the
// delta optimisation) vs. pure constraints or compound clauses.
// Normalization eliminates `and`/`or` so every body is flat and contains only
// relation literals and `=`/`!=` builtins.
//
// `or` is expanded into multiple rules with the same head.
// `and` is simply flattened into the enclosing body.

/**
 * Expand a (possibly compound) body into a list of flat bodies, each
 * containing only regular atoms and `=`/`!=` builtins.
 */
const expand_body = (body: BodyAtom[]): BodyAtom[][] => {
    if (body.length === 0) return [[]]
    const [first, ...rest] = body
    const rest_expanded = expand_body(rest)

    if (is_and(first)) {
        return expand_body([...first.and, ...rest])
    }

    if (is_or(first)) {
        const results: BodyAtom[][] = []
        for (const branch of first.or) {
            for (const tail of expand_body([...branch, ...rest])) {
                results.push(tail)
            }
        }
        return results
    }

    return rest_expanded.map(tail => [first, ...tail])
}

/** Expand all rules so no body contains `or` or `and`. */
export const normalize_rules = (rules: Rule[]): Rule[] =>
    rules.flatMap(rule =>
        expand_body(rule.body).map(body => ({ head: rule.head, body }))
    )

/** Count relation literals (predicate calls) in a normalized body; excludes built-ins and constraints. */
const count_relation_literals = (body: BodyAtom[]): number =>
    body.filter(a => !is_eq(a) && !is_neq(a) && !is_constraint(a)).length

// ─── Naive evaluation ─────────────────────────────────────────────────────────

/**
 * Recursively resolve the remaining `premises` against `facts`, threading
 * the substitution `dict`.  Yields every ground instance of `head` that can
 * be fully derived.
 *
 * Handles all BodyAtom variants: `=`, `!=`, `or`, `and`, and regular atoms.
 */
const resolve = (
    head: Atom,
    premises: BodyAtom[],
    facts: Fact[],
    dict: UnifyDict
): Fact[] => {
    if (premises.length === 0) {
        const f = ground(head, dict)
        return f ? [f] : []
    }
    const [first, ...rest] = premises

    // ── Built-in equality ──────────────────────────────────────────────────────
    if (is_eq(first)) {
        const t1 = match_dict_substitute(dict)(first[1])
        const t2 = match_dict_substitute(dict)(first[2])
        const new_dict = unify_internal(t1, t2, dict, d => d)
        if (new_dict !== false && new_dict !== undefined)
            return resolve(head, rest, facts, new_dict as UnifyDict)
        return []
    }

    // ── Built-in inequality ────────────────────────────────────────────────────
    if (is_neq(first)) {
        const t1 = match_dict_substitute(dict)(first[1])
        const t2 = match_dict_substitute(dict)(first[2])
        // Inequality is only safe to evaluate on ground terms.
        if (!is_ground(t1) || !is_ground(t2)) return []
        const eq = unify_internal(t1, t2, empty_dict(), d => d)
        if (eq === false) return resolve(head, rest, facts, dict)
        return []
    }

    // ── Disjunction ───────────────────────────────────────────────────────────
    if (is_or(first)) {
        const results: Fact[] = []
        for (const branch of first.or) {
            for (const f of resolve(head, [...branch, ...rest], facts, dict))
                add_if_new(results, f)
        }
        return results
    }

    // ── Explicit conjunction (flatten) ────────────────────────────────────────
    if (is_and(first)) {
        return resolve(head, [...first.and, ...rest], facts, dict)
    }

    // ── Named constraint ──────────────────────────────────────────────────────
    if (is_constraint(first)) {
        return solve_constraint(first, dict)
            .flatMap(nextDict => resolve(head, rest, facts, nextDict))
    }

    // ── Relation literal (predicate call against stored facts) ───────────────
    const results: Fact[] = []
    for (const fact of facts) {
        const new_dict = unify_premise(first as Atom, fact, dict)
        if (new_dict !== false)
            results.push(...resolve(head, rest, facts, new_dict))
    }
    return results
}

/** Apply every rule once against the full fact set; return the expanded set. */
const naive_step = (rules: Rule[], facts: Fact[]): Fact[] => {
    const result = [...facts]
    for (const rule of rules) {
        const derived = resolve(rule.head, rule.body, facts, empty_dict())
        for (const f of derived) add_if_new(result, f)
    }
    return result
}

/**
 * Naive bottom-up Datalog evaluation.
 *
 * Repeatedly applies all rules to the entire fact set until no new facts can
 * be derived (least fixpoint).  Simple but re-derives every fact every round.
 *
 * @param rules   Datalog rules (each as `{ head, body }`).
 * @param facts   Initial extensional database (EDB) facts.
 * @returns       All derivable facts (EDB ∪ IDB).
 */
export const naive_datalog = (rules: Rule[], facts: Fact[]): Fact[] => {
    const next = naive_step(rules, facts)
    if (next.length === facts.length) return next
    return naive_datalog(rules, next)
}

// ─── Semi-naive evaluation ────────────────────────────────────────────────────
//
// The semi-naive optimisation avoids re-deriving already-known facts by
// ensuring at least one body literal is resolved against *new* (delta) facts.
//
// Rules are first normalised (or/and expanded) so every body is flat.
// For a normalised body, `delta_relation_index` ranges only over *relation
// literals*; `=` / `!=` are evaluated inline without consuming a delta slot.
//
// Termination: each round can only add facts not yet in `all_facts`, so the
// number of new facts strictly decreases each round.

/**
 * Resolve a normalised body (no `or`/`and`) where the
 * `delta_relation_index`-th *relation literal* must match a delta fact; all
 * others draw from `all_facts`.
 *
 * `relation_literal_index` is how many relation literals have been processed
 * so far (built-ins do not advance it).
 */
const resolve_semi_naive = (
    head: Atom,
    premises: BodyAtom[],
    all_facts: Fact[],
    delta: Fact[],
    delta_relation_index: number,
    dict: UnifyDict,
    relation_literal_index: number
): Fact[] => {
    if (premises.length === 0) {
        const f = ground(head, dict)
        return f ? [f] : []
    }
    const [first, ...rest] = premises

    if (is_eq(first)) {
        const t1 = match_dict_substitute(dict)(first[1])
        const t2 = match_dict_substitute(dict)(first[2])
        const new_dict = unify_internal(t1, t2, dict, d => d)
        if (new_dict !== false && new_dict !== undefined)
            return resolve_semi_naive(head, rest, all_facts, delta, delta_relation_index, new_dict as UnifyDict, relation_literal_index)
        return []
    }

    if (is_neq(first)) {
        const t1 = match_dict_substitute(dict)(first[1])
        const t2 = match_dict_substitute(dict)(first[2])
        if (!is_ground(t1) || !is_ground(t2)) return []
        const eq = unify_internal(t1, t2, empty_dict(), d => d)
        if (eq === false) return resolve_semi_naive(head, rest, all_facts, delta, delta_relation_index, dict, relation_literal_index)
        return []
    }

    if (is_constraint(first)) {
        return solve_constraint(first, dict)
            .flatMap(nextDict =>
                resolve_semi_naive(
                    head,
                    rest,
                    all_facts,
                    delta,
                    delta_relation_index,
                    nextDict,
                    relation_literal_index
                )
            )
    }

    // Relation literal — use delta only at the designated index
    const pool = relation_literal_index === delta_relation_index ? delta : all_facts
    const results: Fact[] = []
  

    for (const fact of pool) {
        const new_dict = unify_premise(first as Atom, fact, dict)
        if (new_dict !== false)
            results.push(...resolve_semi_naive(head, rest, all_facts, delta, delta_relation_index, new_dict, relation_literal_index + 1))
    }
    return results
}

/**
 * One semi-naive round: find all facts derivable using at least one fact from
 * `delta` that are not already in `all_facts`.
 *
 * Takes pre-normalised rules (no `or`/`and` in any body).
 */
const semi_naive_step = (
    normalized: Rule[],
    all_facts: Fact[],
    delta: Fact[]
): Fact[] => {
    const new_facts: Fact[] = []
    const is_known = (f: Fact) =>
        all_facts.some(e => fact_equal(e, f)) ||
        new_facts.some(e => fact_equal(e, f))

    for (const rule of normalized) {
        const num_relation_literals = count_relation_literals(rule.body)

        if (num_relation_literals === 0) {
            // Fact-rule or builtin-only rule: evaluate unconditionally
            for (const f of resolve(rule.head, rule.body, [], empty_dict()))
                if (!is_known(f)) new_facts.push(f)
            continue
        }

        for (let delta_relation_index = 0; delta_relation_index < num_relation_literals; delta_relation_index++) {
            const derived = resolve_semi_naive(
                rule.head, rule.body, all_facts, delta, delta_relation_index, empty_dict(), 0
            )
            for (const f of derived)
                if (!is_known(f)) new_facts.push(f)
        }
    }
    return new_facts
}

/**
 * Semi-naive bottom-up Datalog evaluation.
 *
 * Uses a "delta" (new facts from the previous round) to avoid re-deriving
 * already-known facts.  Each round adds only genuinely new facts.
 *
 * @param rules   Datalog rules (each as `{ head, body }`).
 * @param facts   Initial extensional database (EDB) facts.
 * @returns       All derivable facts (EDB ∪ IDB).
 */
export const semi_naive_datalog = (rules: Rule[], facts: Fact[]): Fact[] => {
    const normalized = normalize_rules(rules)
    let all_facts = [...facts]

    // Seed rules whose body has no relation literals (fact-rules, builtin-only).
    for (const rule of normalized) {
        if (count_relation_literals(rule.body) === 0) {
            for (const f of resolve(rule.head, rule.body, [], empty_dict()))
                add_if_new(all_facts, f)
        }
    }

    let delta = [...all_facts]

    while (delta.length > 0) {
        const new_facts = semi_naive_step(normalized, all_facts, delta)
        for (const f of new_facts) add_if_new(all_facts, f)
        delta = new_facts
    }

    return all_facts
}

// ─── Query API ────────────────────────────────────────────────────────────────

/**
 * Match a pattern atom against every fact in `all_facts` and return the
 * variable bindings for every match.
 *
 * @example
 * query(["edge", "a", V("To")], facts)
 * // => [Map { "To" => "b" }, Map { "To" => "c" }, ...]
 */
export const query = (query_atom: Atom, all_facts: Fact[]): UnifyDict[] => {
    const results: UnifyDict[] = []
    for (const fact of all_facts) {
        const dict = unify_internal(query_atom, fact, empty_dict(), d => d)
        if (dict !== false && dict !== undefined) {
            results.push(dict as UnifyDict)
        }
    }
    return results
}

/**
 * Derive all facts reachable under `rules` from `edb`, then return every
 * ground fact that matches `query_atom`.
 *
 * @example
 * ask(rules, edb, ["path", "a", V("Z")])
 * // => [["path","a","b"], ["path","a","c"], ...]
 */
export const ask = (rules: Rule[], edb: Fact[], query_atom: Atom): Fact[] => {
    const all_facts = semi_naive_datalog(rules, edb)
    return all_facts.filter(
        fact => unify_internal(query_atom, fact, empty_dict(), d => d) !== false
    )
}
