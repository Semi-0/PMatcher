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
// Variables in rule atoms are created with the `V(name)` helper, which
// wraps a name as a P.element pattern understood by Unification.ts.
//
// Usage example:
//
//   import { V, naive_datalog, semi_naive_datalog, type Rule } from "./MiniDatalog"
//
//   const rules: Rule[] = [
//     { head: ["path", V("X"), V("Y")], body: [["edge", V("X"), V("Y")]] },
//     { head: ["path", V("X"), V("Z")], body: [["path", V("X"), V("Y")], ["edge", V("Y"), V("Z")]] },
//   ]
//   const facts: Fact[] = [["edge","a","b"], ["edge","b","c"]]
//
//   naive_datalog(rules, facts)
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

/** A Datalog rule: a head atom and zero or more body atoms. */
export interface Rule {
    head: Atom
    body: Atom[]
}

// ─── Variable helper ──────────────────────────────────────────────────────────

/**
 * Create a Datalog variable: `V("X")` produces a `[P.element, "X"]` pattern
 * that the unification engine treats as a bindable element variable.
 *
 * @example
 * // edge(X, Y) :- path(X, Y)
 * const rule: Rule = {
 *   head: ["path", V("X"), V("Y")],
 *   body: [["edge", V("X"), V("Y")]],
 * }
 */
export const V = (name: string): any[] => [P.element, name]

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

/** Return `fact` if it is not already in `set`; mutates `set` and returns true. */
const add_if_new = (set: Fact[], fact: Fact): boolean => {
    if (set.some(f => fact_equal(f, fact))) return false
    set.push(fact)
    return true
}

/**
 * Apply the substitution `dict` to `atom`; return a ground Fact or `false`
 * when the atom still contains unbound variables.
 */
const ground = (atom: Atom, dict: UnifyDict): Fact | false => {
    const result = match_dict_substitute(dict)(atom)
    return is_ground(result) ? (result as Fact) : false
}

/**
 * Attempt to unify `premise` (a possibly-variable atom) with `fact` (a ground
 * atom), extending `dict`.  Returns the new dict or `false` on failure.
 *
 * This is one-sided unification: facts are always concrete, so the engine
 * simply binds each variable in `premise` to the matching concrete term.
 * The `dict` carries bindings from earlier premises in the same rule body,
 * so consistency is enforced automatically (if X is already bound to "a" and
 * we encounter X again, the engine checks "a" == new_term).
 */
const unify_premise = (premise: Atom, fact: Fact, dict: UnifyDict): UnifyDict | false => {
    const result = unify_internal(premise, fact, dict, d => d)
    return result !== false && result !== undefined ? (result as UnifyDict) : false
}

// ─── Naive evaluation ─────────────────────────────────────────────────────────

/**
 * Recursively resolve the remaining `premises` against `facts`, threading
 * the substitution `dict`.  Yields every ground instance of `head` that can
 * be fully derived.
 */
const resolve = (
    head: Atom,
    premises: Atom[],
    facts: Fact[],
    dict: UnifyDict
): Fact[] => {
    if (premises.length === 0) {
        const f = ground(head, dict)
        return f ? [f] : []
    }
    const [first_premise, ...rest_premises] = premises
    const results: Fact[] = []
    for (const fact of facts) {
        const new_dict = unify_premise(first_premise, fact, dict)
        if (new_dict !== false) {
            results.push(...resolve(head, rest_premises, facts, new_dict))
        }
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
// For a rule body [B0, B1, …, B_{n-1}] we generate n "delta variants":
//
//   variant k: resolve B0…B_{k-1} against ALL facts,
//              Bk against DELTA only,
//              B_{k+1}…B_{n-1} against ALL facts.
//
// A derived fact is accepted only when it is not already in `all_facts`.
//
// Termination: each round can only add facts not yet in `all_facts`, so the
// number of new facts strictly decreases each round.

/**
 * Resolve `premises` where exactly position `delta_pos` must match a delta
 * fact; all other positions draw from `all_facts`.
 */
const resolve_semi_naive = (
    head: Atom,
    premises: Atom[],
    all_facts: Fact[],
    delta: Fact[],
    delta_pos: number,
    dict: UnifyDict,
    pos: number
): Fact[] => {
    if (pos >= premises.length) {
        const f = ground(head, dict)
        return f ? [f] : []
    }
    const premise = premises[pos]
    const pool = pos === delta_pos ? delta : all_facts
    const results: Fact[] = []
    for (const fact of pool) {
        const new_dict = unify_premise(premise, fact, dict)
        if (new_dict !== false) {
            results.push(
                ...resolve_semi_naive(head, premises, all_facts, delta, delta_pos, new_dict, pos + 1)
            )
        }
    }
    return results
}

/**
 * One semi-naive round: find all facts derivable using at least one fact from
 * `delta` that are not already in `all_facts`.
 */
const semi_naive_step = (
    rules: Rule[],
    all_facts: Fact[],
    delta: Fact[]
): Fact[] => {
    const new_facts: Fact[] = []
    const is_known = (f: Fact) =>
        all_facts.some(e => fact_equal(e, f)) ||
        new_facts.some(e => fact_equal(e, f))

    for (const rule of rules) {
        const n = rule.body.length

        if (n === 0) {
            // Fact-rules: head is always ground, derived unconditionally
            const f = ground(rule.head, empty_dict())
            if (f && !is_known(f)) new_facts.push(f)
            continue
        }

        for (let delta_pos = 0; delta_pos < n; delta_pos++) {
            const derived = resolve_semi_naive(
                rule.head,
                rule.body,
                all_facts,
                delta,
                delta_pos,
                empty_dict(),
                0
            )
            for (const f of derived) {
                if (!is_known(f)) new_facts.push(f)
            }
        }
    }
    return new_facts
}

/**
 * Semi-naive bottom-up Datalog evaluation.
 *
 * Uses a "delta" (new facts from the previous round) to avoid re-deriving
 * already-known facts.  Each round adds only genuinely new facts, so the
 * total work across all rounds is proportional to the size of the output
 * rather than re-scanning the whole fact base each time.
 *
 * First round: delta = EDB (all initial facts are "new").
 * Subsequent rounds: delta = facts derived in the previous round.
 *
 * @param rules   Datalog rules (each as `{ head, body }`).
 * @param facts   Initial extensional database (EDB) facts.
 * @returns       All derivable facts (EDB ∪ IDB).
 */
export const semi_naive_datalog = (rules: Rule[], facts: Fact[]): Fact[] => {
    let all_facts = [...facts]

    // Fact-rules (empty body) are independent of any delta; seed them first so
    // they end up in the initial delta even when the EDB is empty.
    for (const rule of rules) {
        if (rule.body.length === 0) {
            const f = ground(rule.head, empty_dict())
            if (f) add_if_new(all_facts, f)
        }
    }

    let delta = [...all_facts]      // round 0: EDB + fact-rule heads are "new"

    while (delta.length > 0) {
        const new_facts = semi_naive_step(rules, all_facts, delta)
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
 * Variables created with `V()` in `query_atom` are bound to the matching
 * concrete values; concrete terms in `query_atom` act as equality filters.
 *
 * @example
 * // All edges from "a"
 * query(["edge", "a", V("To")], facts)
 * // => [Map { "To" => "b" }, Map { "To" => "c" }, ...]
 *
 * @example
 * // All edges (both endpoints free)
 * query(["edge", V("X"), V("Y")], facts)
 * // => [Map { "X" => "a", "Y" => "b" }, ...]
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
 * Concrete terms in `query_atom` filter by value; variables match anything.
 *
 * @example
 * // All nodes reachable from "a" via path rules
 * ask(rules, edb, ["path", "a", V("Z")])
 * // => [["path","a","b"], ["path","a","c"], ...]
 */
export const ask = (rules: Rule[], edb: Fact[], query_atom: Atom): Fact[] => {
    const all_facts = semi_naive_datalog(rules, edb)
    return all_facts.filter(
        fact => unify_internal(query_atom, fact, empty_dict(), d => d) !== false
    )
}
