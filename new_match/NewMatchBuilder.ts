// SPDX-License-Identifier: GPL-3.0-or-later
//
// Copyright (c) 2009–2015 Gerald Jay Sussman and Chris Hanson
// Copyright (c) 2024–2026 semi-0
//
// This file is a TypeScript port of the propagator system
// described in Software Design for Flexibility.

/**
 * ## NewMatchBuilder — pattern compiler for `new_match` matchers
 *
 * Mirrors [MatchBuilder.ts](../MatchBuilder.ts) dispatch shape: same `P` tags and predicates (re-exported
 * from MatchBuilder), but produces {@link matcher} functions and uses {@link MatchDict} from NewMatchDict.
 *
 * See [README.md](./README.md) for differences vs the legacy builder.
 */

import { match_args } from "generic-handler/Predicates"
import { empty_match_dict, default_match_env, type MatchDict } from "../MatchDict/NewMatchDict"
import { isString } from "../utility"
import { MatchResult } from "../MatchResult/MatchResult"
import type { MatchFailure } from "../MatchResult/MatchFailure"
import type { MatchPartialSuccess } from "../MatchResult/PartialSuccess"
import { isSucceed } from "../Predicates"
import { first, rest, isPair, isEmpty, isArray, second, third } from "../GenericArray"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure"
import { register_predicate } from "generic-handler/Predicates"
import { is_array } from "generic-handler/built_in_generics/generic_predicates"
import {
    P,
    translate,
    first_equal_with,
    is_match_constant,
    is_Letrec,
    is_compose,
    is_select,
    is_new_var,
    is_match_element,
    is_match_segment,
    is_segment_independently,
    is_match_reference,
    is_wildcard,
    is_begin,
    is_extract_matcher,
    is_map,
    is_with,
    is_transform,
    is_partial_obj,
} from "../MatchBuilder"
import type { matcher } from "./MatcherNameStore"
import { is_registered_new_matcher } from "./MatcherNameStore"
import {
    match_choose,
    match_letrec,
    match_reference,
    match_new_var,
    match_compose,
    match_empty,
    match_element,
    match_segment,
    match_wildcard,
    match_constant,
    match_all_other_element,
    match_begin,
    match_segment_independently,
    match_map,
    match_with,
    match_transform,
    match_array,
} from "./NewMatchCombinator"
import { match_object, match_object_partial } from "./MatchObjectNew"

const is_empty_pattern = register_predicate(
    "is_empty_pattern_new_match_builder",
    (pattern: any): boolean => pattern === P.empty
)

const is_all_other_element_pattern = register_predicate(
    "is_all_other_element_new_match_builder",
    (pattern: any): boolean => isString(pattern) && pattern === "..."
)

export const compile = construct_simple_generic_procedure("compile_new_match", 1, (matchers: any[]) => {
    throw Error(`unrecognized pattern in the new match build procedure: ${matchers}`)
})

export {
    P,
    translate,
    first_equal_with,
    is_match_constant,
    is_Letrec,
    is_compose,
    is_select,
    is_new_var,
    is_match_element,
    is_match_segment,
    is_segment_independently,
    is_match_reference,
    is_many,
    is_extract_var_names,
    is_wildcard,
    is_begin,
    is_extract_matcher,
    is_map,
    is_with,
    is_transform,
    is_partial_obj,
} from "../MatchBuilder"

const is_plain_object_pattern_nm = register_predicate(
    "is_plain_object_pattern_nm",
    (pattern: any): boolean =>
        typeof pattern === "object" &&
        pattern !== null &&
        !Array.isArray(pattern) &&
        !is_registered_new_matcher(pattern)
)

define_generic_procedure_handler(compile,
    match_args(is_plain_object_pattern_nm),
    (pattern: Record<string, any>) => {
        const compiled: Record<string, matcher> = {}
        for (const key of Object.keys(pattern)) {
            compiled[key] = compile(pattern[key])
        }
        return match_object(compiled)
    }
)

define_generic_procedure_handler(compile,
    match_args(is_array),
    (pattern: any[]) => {
        return match_array(pattern.map((item: any) => compile(item)))
    }
)

define_generic_procedure_handler(compile,
    match_args(is_partial_obj),
    (pattern: any[]) => {
        const patternObj = pattern[1] as Record<string, any>
        const compiled: Record<string, matcher> = {}
        for (const key of Object.keys(patternObj)) {
            compiled[key] = compile(patternObj[key])
        }
        return match_object_partial(compiled)
    }
)

define_generic_procedure_handler(compile,
    match_args(is_match_constant),
    (pattern: any) => {
        if ((isPair(pattern)) && (pattern.length == 2)){
            return match_constant(pattern[1])
        }
        else if (isString(pattern)){
            return match_constant(pattern)
        }
        else{
            throw Error(`unrecognized constant pattern in the build procedure: ${pattern}`)
        }
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_all_other_element_pattern),
    (pattern: any[]) => {
        return match_all_other_element()
    }
)

define_generic_procedure_handler(compile,
    match_args(is_empty_pattern),
    (pattern: any) => {
        return match_empty()
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_Letrec),
    (pattern: any[]) => {
        if (pattern.length !== 3) {
            throw Error(`unrecognized pattern in the letrec procedure: ${pattern}`)
        }

        const bindings = pattern[1].map((item: any[]) => ({ key: item[0], value: compile(item[1]) }));

        return match_letrec(bindings, compile(pattern[2]))
    }
)

define_generic_procedure_handler(compile,
    match_args(is_compose),
    (pattern: any[]) => {
        return match_compose(pattern.slice(1).map((item: any) => compile(item)))
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_select),
    (pattern: any[]) => {
        return match_choose(pattern.slice(1).map((item: any) => compile(item)))
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_new_var),
    (pattern: any[]) => {
        return match_new_var(pattern[1], compile(pattern[2]))
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_match_element),
    (pattern: any[]) => {
        return match_element(pattern[1], pattern[2])
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_match_segment),
    (pattern: any[]) => {
        return match_segment(pattern[1], pattern[2])
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_segment_independently),
    (pattern: any[]) => {
        return match_segment_independently(pattern[1], pattern[2])
    }
)

define_generic_procedure_handler(compile, 
    match_args(is_match_reference),
    (pattern: any[]) => {
        return match_reference(pattern[1])
    }
)

// define_generic_procedure_handler(compile, 
//     match_args(is_many),
//     (pattern: any[]) => {
//         const matcher = pattern.slice(1)
//         const vars = extract_var_names(matcher)
//         const expr =  [P.letrec,
//             [["repeat", 
//                 [P.new, vars,
//                     [P.choose,
//                         P.empty,
//                         [P.compose,
//                             ...matcher,
//                             [P.ref, "repeat"]]]]]],
//             [P.ref, "repeat"]]
//         return compile(expr)
//     }
// )

// /// THIS IS SOOO DUUUMB
// export function extract_var_names(pattern: any[]): string[] {
//     const names = pattern.flatMap((item: any) => {
//         const excluded = get_all_critics(compile).filter((pred: (arg: any) => Boolean) => {
//             return pred !== is_match_element && pred !== is_match_segment && pred !== isArray && pred !== is_select && pred !== is_transform
//         }).some((pred: (arg: any) => Boolean) => {
//             if (pred(item)){
//             }
//             return pred(item)
//         })
//         if (excluded){
//             return [];
//         } 
//         else if (is_match_element(item)) {
//             return [item[1]];
//         } else if (is_match_segment(item)) {
//             return [item[1]];
//         } else if (is_select(item)){
//             const select_item = item.slice(1).flatMap((clause: any[]) => extract_var_names(clause))
//             return select_item
//         }
//         else if (is_transform(item)){
//             return extract_var_names([item[2]])
//         }
        
//         else if (isArray(item)) {
//             return extract_var_names(item);
//         } else {
//             return [];
//         }
//     });

//     // Remove duplicates using Set
//     return [...new Set(names)];
// }

// define_generic_procedure_handler(compile, 
//     match_args(is_extract_var_names),
//     (pattern: any[]) => {
//         return extract_var_names(pattern[1])
//     }
// )

define_generic_procedure_handler(compile, 
    match_args(is_wildcard),
    (pattern: any[]) => {
        return match_wildcard()
    }
)

define_generic_procedure_handler(compile,
    match_args(is_begin),
    (pattern: any[]) => {
        return match_begin(pattern.slice(1).map((item: any) => compile(item)))
    }
)

define_generic_procedure_handler(compile,
    match_args(is_extract_matcher),
    (_pattern: any[]) => {
        throw new Error(
            "[new_match] P.extract_matcher is not implemented for Map-based matchers; build the extracted matcher by hand or use legacy MatchBuilder."
        )
    }
)

define_generic_procedure_handler(compile,
    match_args(is_registered_new_matcher),
    (pattern: matcher) => {
        return pattern
    }
)

define_generic_procedure_handler(compile,
    match_args(is_map),
    (pattern: any[]) => {
        return match_map(compile(pattern[1]), compile(pattern[2]))
    }
)

define_generic_procedure_handler(compile,
    match_args(is_with),
    (pattern: any[]) => {
        return match_with(first(second(pattern)), compile(third(pattern)))
    }
)

define_generic_procedure_handler(compile,
    match_args(is_transform),
    (pattern: any[]) => {
        return match_transform(pattern[1], compile(pattern[2]))
    }
)

/** Same contract as legacy {@link run_matcher}: wraps `data` as `[data]` for one stream cell. */
export function run_matcher(
    matcherFn: matcher,
    data: any,
    succeed: (dict: MatchDict, nEaten: number) => any
): any | MatchResult | MatchPartialSuccess | MatchFailure {
    return matcherFn([data], empty_match_dict(), default_match_env(), (dict, nEaten) => succeed(dict, nEaten))
}

// short-hand interface 

/**
 * Attempts to match the input array against the provided matcher expression.
 * 
 * @param input - The array of input elements to be matched.
 * @param matcher_expr - The matcher expression defining the pattern to match against.
 * @returns An object containing the match dictionary and the number of elements consumed if successful,
 *          or a MatchFailure object if the match fails.
 */
export function match(input: any, matcher_expr: any): any | MatchResult | MatchPartialSuccess | MatchFailure {
    const m = compile(matcher_expr);
    const result = run_matcher(m, input, (dict, e) => new MatchResult(dict as any, e));
    // const result = internal_match(m, input, empty_match_dict(), default_match_env(), (dict, e) => { return new MatchResult(dict, e) });

    if (isSucceed(result)) {
        // @ts-ignore
        return result as MatchResult;
    } else {
        // @ts-ignore
        return result as MatchFailure;
    }
}

/**
 * Attempts to match the input array against the provided matcher expression and returns a boolean indicating success.
 * 
 * @param input - The array of input elements to be matched.
 * @param matcher_expr - The matcher expression defining the pattern to match against.
 * @returns True if the match is successful, otherwise false.
 */
export function try_match(input: any, matcher_expr: string[]): boolean {
    const result = match(input, matcher_expr);
    if (isSucceed(result)) {
        return true;
    } else {
        return false;
    }
}

export function match_pair(expr: any[], exec: (...args: any[]) => any): any[] {
    return [expr, exec]
}

export function get_pair_exec(expr: any[]): (...args: any[]) => any {
    return expr[1]
} 

export function get_pair_expr(expr: any[]): any[] {
    return expr[0]
}





