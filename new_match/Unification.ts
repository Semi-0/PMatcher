// SPDX-License-Identifier: GPL-3.0-or-later
//
// Copyright (c) 2009–2015 Gerald Jay Sussman and Chris Hanson
// Copyright (c) 2024–2026 semi-0
//
// Port of the generic unification engine from unify.scm / match-utils.scm
// (SDF "Software Design for Flexibility") to TypeScript, adapted for the
// new_match pattern system (P.element / P.segment variable syntax).
//
// Key differences from the prior version:
//   - Variable identity is extracted by name (string key) so Map lookups are
//     reliable instead of using array-reference equality.
//   - `do_substitute` uses the correct guard from the Scheme original:
//       satisfies-restriction AND (sameVar OR NOT occurs-in)
//     instead of the broken (isVar && sameVar) AND !occurs-in form.
//   - Segment-variable handlers are fully ported from unify.scm, including
//     the backtracking `grab_segment` / `maybe_grab_segment` machinery and
//     proper handling of empty term lists via `not_first_satisfies`.
//   - A flat `UnifyDict = Map<string, any>` is used internally; the scoped
//     MatchDict is not needed for pure syntactic unification.
//   - Top-level `unify()` and `unifier()` public API functions are provided.

import { is_match_element, is_match_segment } from "../MatchBuilder"
import { isEmpty, first, rest } from "../GenericArray"
import { match_args, register_predicate } from "generic-handler/Predicates"
import {
    construct_simple_generic_procedure,
    define_generic_procedure_handler,
} from "generic-handler/GenericProcedure"
import { equal } from "../utility"
import { is_array } from "generic-handler/built_in_generics/generic_predicates"

// ─── Variable helpers ────────────────────────────────────────────────────────

/** Extract the string name from an element/segment variable pattern. */
export const get_var_name = (variable: any[]): string => variable[1]

/** True when `term` is any match-variable pattern (element or segment). */
export const is_match_var = (term: any): boolean =>
    is_match_element(term) || is_match_segment(term)

/**
 * True when two variable patterns have the same type tag (P.element / P.segment)
 * and the same name.  Mirrors match:vars-equal? from match-utils.scm.
 */
export const match_var_equal = (v1: any, v2: any): boolean => {
    if (!is_array(v1) || !is_array(v2)) return false
    return (v1 as any[])[0] === (v2 as any[])[0] && (v1 as any[])[1] === (v2 as any[])[1]
}

export const match_has_restriction = (variable: any[]): boolean =>
    is_array(variable) && (variable as any[]).length === 3 &&
    typeof (variable as any[])[2] === "function"

export const match_get_restriction = (variable: any[]): (x: any) => boolean =>
    (variable as any[])[2]

export const match_satisfies_restriction = (variable: any[], value: any): boolean =>
    !match_has_restriction(variable) || match_get_restriction(variable)(value)

// ─── Unification dictionary ───────────────────────────────────────────────────
//
// A flat Map<varName, value> is sufficient for syntactic unification.
// Variable names (strings) are the keys; values are arbitrary terms.

export type UnifyDict = Map<string, any>

export const empty_dict = (): UnifyDict => new Map<string, any>()

export const match_has_bindings = (variable: any[], dict: UnifyDict): boolean =>
    dict.has(get_var_name(variable))

export const match_get_value = (variable: any[], dict: UnifyDict): any =>
    dict.get(get_var_name(variable))

export const match_lookup = (variable: any[], dict: UnifyDict): any =>
    dict.get(get_var_name(variable))

export const match_extend_dict = (
    variable: any[],
    value: any,
    dict: UnifyDict
): UnifyDict => {
    const new_dict = new Map(dict)
    new_dict.set(get_var_name(variable), value)
    return new_dict
}

export const match_map_dict_values = (
    fn: (value: any) => any,
    dict: UnifyDict
): UnifyDict => {
    const new_dict = new Map<string, any>()
    for (const [key, value] of dict) {
        new_dict.set(key, fn(value))
    }
    return new_dict
}

// ─── Substitution ────────────────────────────────────────────────────────────

/**
 * True when `variable` appears anywhere inside `pattern`.
 * Mirrors match:occurs-in? from match-utils.scm.
 */
export const match_occurs_in = (variable: any[], pattern: any): boolean => {
    if (is_match_var(pattern)) return match_var_equal(pattern, variable)
    if (is_array(pattern))
        return (pattern as any[]).some((sub: any) => match_occurs_in(variable, sub))
    return false
}

/**
 * Walk `pattern` substituting bound variables, splicing segment bindings into
 * arrays.  Mirrors match:map-vars from match-utils.scm.
 */
export const match_map_var = (
    get_value: (variable: any, get_default: () => any) => any,
    pattern: any
): any => {
    const loop = (p: any): any => {
        if (is_match_element(p)) {
            return get_value(p, () => p)
        } else if (is_match_segment(p)) {
            // Top-level segment var: no splicing possible; return as-is
            return p
        } else if (is_array(p)) {
            const result: any[] = []
            for (const sub of p as any[]) {
                if (is_match_segment(sub)) {
                    const val = get_value(sub, () => null)
                    if (val !== null && val !== undefined && Array.isArray(val)) {
                        result.push(...val)
                    } else {
                        result.push(sub)
                    }
                } else {
                    result.push(loop(sub))
                }
            }
            return result
        } else {
            return p
        }
    }
    return loop(pattern)
}

/** Apply all current dict bindings to `pattern`.  Mirrors match:dict-substitution. */
export const match_dict_substitute =
    (dict: UnifyDict) =>
    (pattern: any): any =>
        match_map_var(
            (variable: any, get_default: () => any) => {
                const name = get_var_name(variable)
                if (dict.has(name)) return dict.get(name)
                return get_default()
            },
            pattern
        )

/** Returns a substitution function that replaces one specific variable with `value`. */
export const match_single_substitution =
    (variable: any[], value: any) =>
    (pattern: any): any =>
        match_map_var(
            (_var: any, get_default: () => any) => {
                if (match_var_equal(_var, variable)) return value
                return get_default()
            },
            pattern
        )

// ─── Generic dispatch ─────────────────────────────────────────────────────────

export type UnifySucceed = (
    dict: UnifyDict,
    failure: () => any,
    rest_a: any[],
    rest_b: any[]
) => any
export type UnifyFailure = () => any
export type UnifyDispatcher = (
    dict: UnifyDict,
    succeed: UnifySucceed,
    failure: UnifyFailure
) => any

/** Counter for generating unique predicate registration names. */
let _pred_counter = 0

/**
 * Returns a predicate that is true when the first element of a non-empty list
 * satisfies `with_pred`.  Mirrors (car-satisfies pred) from unify.scm.
 */
export const first_satisfies = (with_pred: (x: any) => boolean) =>
    register_predicate(
        "unify_new_first_satisfies_" + _pred_counter++,
        (x: any): boolean =>
            is_array(x) &&
            !isEmpty(x as any[]) &&
            with_pred(first(x as any[]))
    )

/**
 * Returns a predicate that is true when `x` is an array that does NOT start
 * with an element satisfying `with_pred` — including empty arrays.
 * Mirrors (complement (car-satisfies pred)) from unify.scm, which returns
 * true for empty lists because (pair? '()) is false.
 */
export const not_first_satisfies = (with_pred: (x: any) => boolean) =>
    register_predicate(
        "unify_new_not_first_satisfies_" + _pred_counter++,
        (x: any): boolean => {
            if (!is_array(x)) return false
            if (isEmpty(x as any[])) return true
            return !with_pred(first(x as any[]))
        }
    )

export const unify_fail = (_terms_a: any[], _terms_b: any[]): UnifyDispatcher =>
    (_dict, _succeed, failure) =>
        failure()

export const unify_gdispatch = construct_simple_generic_procedure(
    "unify_gdispatch_new_match",
    2,
    unify_fail
)

/**
 * Dispatch-loop over parallel term lists.
 * Mirrors unify:dispatch from unify.scm.
 */
export const unify_dispatch = (terms_a: any[], terms_b: any[]): UnifyDispatcher =>
    (dict, succeed, failure) => {
        if (isEmpty(terms_a) && isEmpty(terms_b)) {
            return succeed(dict, failure, terms_a, terms_b)
        }
        return unify_gdispatch(terms_a, terms_b)(
            dict,
            (
                _dict: UnifyDict,
                _failure: UnifyFailure,
                rest_a: any[],
                rest_b: any[]
            ) => unify_dispatch(rest_a, rest_b)(_dict, succeed, _failure),
            failure
        )
    }

// ─── Constant unification ─────────────────────────────────────────────────────

export const is_constant_item = (term: any): boolean =>
    !is_match_var(term) && !is_array(term)

export const unify_constant_terms =
    (terms_a: any[], terms_b: any[]) => {
        const first_a = first(terms_a)
        const first_b = first(terms_b)
        const rest_a = rest(terms_a)
        const rest_b = rest(terms_b)
        return (dict: UnifyDict, succeed: UnifySucceed, failure: UnifyFailure) => {
            if (equal(first_a, first_b)){
                return succeed(dict, failure, rest_a, rest_b)
            }
            else {
                return failure()
            }
        }
    }

define_generic_procedure_handler(
    unify_gdispatch,
    match_args(
        first_satisfies(is_constant_item),
        first_satisfies(is_constant_item)
    ),
    unify_constant_terms
)

// ─── List (array) unification ─────────────────────────────────────────────────

export const is_list_term = (term: any): boolean =>
    !is_match_var(term) && is_array(term)

export const unify_list_terms =
    (terms_a: any[], terms_b: any[]) => {
        const first_a = first(terms_a) as any[]
        const first_b = first(terms_b) as any[]
        const rest_a = rest(terms_a)
        const rest_b = rest(terms_b)
        return (dict: UnifyDict, succeed: UnifySucceed, failure: UnifyFailure) =>
            unify_dispatch(first_a, first_b)(
                dict,
                (
                    _dict: UnifyDict,
                    _failure: UnifyFailure,
                    null_a: any[],
                    null_b: any[]
                ) => {
                    if (!isEmpty(null_a) || !isEmpty(null_b)){
                        return _failure()
                    }
                    else {
                        return succeed(_dict, _failure, rest_a, rest_b)
                    }
                },
                failure
            )
    }

define_generic_procedure_handler(
    unify_gdispatch,
    match_args(
        first_satisfies(is_list_term),
        first_satisfies(is_list_term)
    ),
    unify_list_terms
)

// ─── Element variable substitution ───────────────────────────────────────────
//
// Mirrors maybe-substitute / do-substitute from unify.scm.

/**
 * Try to unify `variable` with `term` inside `dict`.
 *
 * Returns the extended dict on success, or `false` when:
 *   - the term violates the variable's restriction, or
 *   - the occurs check would create a circular binding.
 *
 * Corrected guard vs prior version:
 *   satisfies-restriction AND (sameVar OR NOT occurs-in)
 */
export const do_substitute = (
    variable: any[],
    term: any,
    dict: UnifyDict
): UnifyDict | false => {
    const term_star = match_dict_substitute(dict)(term)
    if (!match_satisfies_restriction(variable, term_star)) return false
    if (match_var_equal(variable, term_star) || !match_occurs_in(variable, term_star)) {
        return match_extend_dict(
            variable,
            term_star,
            match_map_dict_values(match_single_substitution(variable, term_star), dict)
        )
    }
    return false
}

/**
 * Syntactic equation solver for element variables.
 * Mirrors maybe-substitute from unify.scm.
 */
export const maybe_substitute = (var_first: any[], terms: any[]): UnifyDispatcher =>
    (dict, succeed, failure) => {
        const variable = first(var_first)
        const rest_a = rest(var_first)
        const term = first(terms)
        const rest_b = rest(terms)

        // Case 1: both are the exact same element variable
        if (is_match_element(term) && match_var_equal(variable, term)) {
            return succeed(dict, failure, rest_a, rest_b)
        }
        // Case 2: variable already bound — unify its value against term
        else if (match_has_bindings(variable, dict)) {
            return unify_dispatch(
                [match_get_value(variable, dict), ...rest_a],
                terms
            )(dict, succeed, failure)
        }
        else {
        // Case 3: attempt fresh substitution
            const new_dict = do_substitute(variable, term, dict)
            if (new_dict !== false) return succeed(new_dict, failure, rest_a, rest_b)
            return failure()
        }
    }

/** Any term that is NOT a segment variable.  Mirrors element? from unify.scm. */
export const is_element = (term: any): boolean => !is_match_segment(term)

// Element var on the left, any non-segment term on the right
define_generic_procedure_handler(
    unify_gdispatch,
    match_args(
        first_satisfies(is_match_element),
        first_satisfies(is_element)
    ),
    (var_first: any[], terms: any[]) => maybe_substitute(var_first, terms)
)

// Any non-segment term on the left, element var on the right
define_generic_procedure_handler(
    unify_gdispatch,
    match_args(
        first_satisfies(is_element),
        first_satisfies(is_match_element)
    ),
    (terms: any[], var_first: any[]) => maybe_substitute(var_first, terms)
)

// ─── Segment variable unification ────────────────────────────────────────────
//
// Mirrors maybe-grab-segment / grab-segment / unify:segment-var-var from unify.scm.
// CPS backtracking: `continue_fn` is threaded as the failure continuation so
// that, when the current segment size fails, the next larger size is tried.

/**
 * Try every prefix of `terms` as the binding for the segment variable at the
 * head of `var_first`, shortest first, using CPS backtracking.
 * Mirrors grab-segment from unify.scm.
 */
export const grab_segment = (var_first: any[], terms: any[]): UnifyDispatcher =>
    (dict, succeed, failure) => {
        const variable = first(var_first)
        const rest_a = rest(var_first)

        const slp = (initial: any[], terms_remaining: any[]): any => {
            const continue_fn = (): any => {
                if (isEmpty(terms_remaining)) return failure()
                return slp(
                    [...initial, first(terms_remaining)],
                    rest(terms_remaining)
                )
            }
            const new_dict = do_substitute(variable, initial, dict)
            if (new_dict !== false) {
                // Pass continue_fn as failure so the caller can backtrack
                return succeed(new_dict, continue_fn, rest_a, terms_remaining)
            }
            return continue_fn()
        }

        return slp([], terms)
    }

/**
 * If the segment variable is already bound, expand its binding and continue
 * unification.  Otherwise delegate to grab_segment.
 * Mirrors maybe-grab-segment from unify.scm.
 */
export const maybe_grab_segment = (var_first: any[], terms: any[]): UnifyDispatcher =>
    (dict, succeed, failure) => {
        const variable = first(var_first)
        if (match_has_bindings(variable, dict)) {
            return unify_dispatch(
                [...(match_get_value(variable, dict) as any[]), ...rest(var_first)],
                terms
            )(dict, succeed, failure)
        }
        return grab_segment(var_first, terms)(dict, succeed, failure)
    }

/**
 * Unify two segment variables.  Equal names succeed immediately; otherwise
 * try grabbing from either side with symmetric fallback.
 * Mirrors unify:segment-var-var from unify.scm.
 */
export const unify_segment_var_var =
    (var_first1: any[], var_first2: any[]): UnifyDispatcher =>
    (dict, succeed, failure) => {
        if (match_var_equal(first(var_first1), first(var_first2))) {
            return succeed(dict, failure, rest(var_first1), rest(var_first2))
        }
        return maybe_grab_segment(var_first1, var_first2)(
            dict,
            succeed,
            () => maybe_grab_segment(var_first2, var_first1)(dict, succeed, failure)
        )
    }

// Both are segment vars
define_generic_procedure_handler(
    unify_gdispatch,
    match_args(
        first_satisfies(is_match_segment),
        first_satisfies(is_match_segment)
    ),
    unify_segment_var_var
)

// Segment var on the left; right side is any array not starting with a segment
// var (including empty lists — mirrors (complement (car-satisfies segment-var?)))
define_generic_procedure_handler(
    unify_gdispatch,
    match_args(
        first_satisfies(is_match_segment),
        not_first_satisfies(is_match_segment)
    ),
    (var_first: any[], terms: any[]) => maybe_grab_segment(var_first, terms)
)

// Non-segment on the left (including empty list), segment var on the right
define_generic_procedure_handler(
    unify_gdispatch,
    match_args(
        not_first_satisfies(is_match_segment),
        first_satisfies(is_match_segment)
    ),
    (terms: any[], var_first: any[]) => maybe_grab_segment(var_first, terms)
)

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Internal entry point shared by `unify` and `unifier`.
 * Wraps both patterns in singleton lists, then verifies all terms are consumed.
 * Mirrors unify:internal from unify.scm.
 */
export const unify_internal = (
    pattern1: any,
    pattern2: any,
    dict: UnifyDict,
    succeed: (dict: UnifyDict) => any
): any =>
    unify_dispatch([pattern1], [pattern2])(
        dict,
        (
            _dict: UnifyDict,
            _failure: UnifyFailure,
            rest1: any[],
            rest2: any[]
        ) => {
            if (isEmpty(rest1) && isEmpty(rest2)) return succeed(_dict)
            return _failure()
        },
        () => false
    )

/**
 * Attempt to unify `pattern1` with `pattern2`.
 *
 * @returns A `UnifyDict` mapping variable names to unified values on success,
 *          or `false` if the patterns cannot be unified.
 */
export const unify = (pattern1: any, pattern2: any): UnifyDict | false => {
    const result = unify_internal(pattern1, pattern2, empty_dict(), (d) => d)
    return result !== false && result !== undefined ? result : false
}

/**
 * Unify `pattern1` with `pattern2` and return `pattern1` with all variables
 * substituted by their unified values.
 *
 * @returns The substituted form of `pattern1`, or `false` on failure.
 */
export const unifier = (pattern1: any, pattern2: any): any | false => {
    const dict = unify(pattern1, pattern2)
    if (dict === false) return false
    return match_dict_substitute(dict)(pattern1)
}
