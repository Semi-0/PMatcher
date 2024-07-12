import type { matcher_callback } from "./MatchCallback";
import { MatchDict, get_dict_value_sequence, get_raw_entity } from "./MatchDict/MatchDict";
import { match_constant, match_element, match_empty, match_segment } from "./MatchCallback";
import {  match_choose, match_letrec, match_reference, match_new_var, match_compose } from "./MatchCombinator";
import { empty_match_dict } from "./MatchDict/MatchDict";
import { first, rest, isPair, isEmptyArray, isArray, isString, isMatcher } from "./utility";
import  { match_array } from "./MatchCombinator";
import { inspect } from "util";
import { matchSuccess, type MatchFailure } from "./MatchResult";
import { match_all_other_element } from "./MatchCallback";

import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";

import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import { default_match_env } from "./MatchEnvironment";
import { v4 as uuidv4 } from 'uuid';
import { DictValue, get_value_sequence } from "./MatchDict/DictValue";

export const build_matcher_expr = construct_simple_generic_procedure("build_matcher_expr", 1,
    (matchers: any[]) => {
        throw Error(`unrecognized pattern in the build procedure: ${inspect(matchers)}`)
    }
)





export const P = { // Stands for Pattern
    letrec: uuidv4(), 
    choose: uuidv4(), 
    new: uuidv4(), 
    new_obj: uuidv4(),
    element: uuidv4(),
    segment: uuidv4(),
    ref: uuidv4(),
    constant: uuidv4(),
    many: uuidv4(),
    compose: uuidv4(),
    empty: uuidv4()
    
}


define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => isArray(pattern),
    (pattern: any[]) => {
        return match_array(pattern.map((item: any) => build_matcher_expr(item)))
    }
)


define_generic_procedure_handler(build_matcher_expr,
    (pattern: any) => is_match_constant(pattern),
    (pattern: any) => {
        if ((isPair(pattern)) && (pattern.length == 2)){
            return match_constant(pattern[1])
        }
        else if (isString(pattern)){
            return match_constant(pattern)
        }
        else{
            throw Error(`unrecognized constant pattern in the build procedure: ${inspect(pattern)}`)
        }
    }
)

// define_generic_procedure_handler(build, 
//     (pattern: any[]) => is_match_repeated_pattern(pattern),
//     (pattern: any[]) => {
//         console.log("matched")
//         if (pattern.length !== 2) {
//             throw Error(`unrecognized pattern in the repeated procedure: ${inspect(pattern)}`)
//         }
//         const built_pattern = build(pattern[1])
//         console.log("build(pattern[1])", built_pattern.toString() )
//         return match_repeated_patterns(built_pattern)
//     }
// )


export function is_match_constant(pattern: any): boolean {
    return first_equal_with(pattern, P.constant) || isString(pattern)
}

export function first_equal_with(pattern: any, value: any): boolean {
    return isPair(pattern) && isString(first(pattern)) && first(pattern) === value
}



function is_all_other_element(pattern: any): boolean {
    return isString(pattern) && pattern === "..."
}

define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => is_all_other_element(pattern),
    (pattern: any[]) => {
        return match_all_other_element()
    }
)


function is_empty(pattern: any): boolean{
    return  pattern === P.empty
}

define_generic_procedure_handler(build_matcher_expr,
    (pattern: any) => is_empty(pattern),
    (pattern: any) => {
        return match_empty()
    }
)


export function is_Letrec(pattern: any): boolean {
    return first_equal_with(pattern, P.letrec)
}

define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => is_Letrec(pattern),
    (pattern: any[]) => {
        if (pattern.length !== 3) {
            throw Error(`unrecognized pattern in the letrec procedure: ${inspect(pattern)}`)
        }

        const bindings = pattern[1].map((item: any[]) => ({ key: item[0], value: build_matcher_expr(item[1]) }));

        return match_letrec(bindings, build_matcher_expr(pattern[2]))
    }
)


export function is_compose(pattern: any[]): boolean{
    return first_equal_with(pattern, P.compose) 
}

define_generic_procedure_handler(build_matcher_expr,
    (pattern: any[]) => is_compose(pattern),
    (pattern: any[]) => {
        return match_compose(pattern.slice(1).map((item: any) => build_matcher_expr(item)))
    }
)





export function is_select(pattern: any): boolean {
    return first_equal_with(pattern, P.choose)
}

define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => is_select(pattern),
    (pattern: any[]) => {
        return match_choose(pattern.slice(1).map((item: any) => build_matcher_expr(item)))
    }
)


export function is_new_var(pattern: any): boolean {
    return first_equal_with(pattern, P.new)
}

define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => is_new_var(pattern),
    (pattern: any[]) => {
        return match_new_var(pattern[1], build_matcher_expr(pattern[2]))
    }
)


function is_match_element(pattern: any): boolean {
   return first_equal_with(pattern, P.element)
}

define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => is_match_element(pattern),
    (pattern: any[]) => {
        return match_element(pattern[1], pattern[2])
    }
)


function is_match_segment(pattern: any): boolean {
    return first_equal_with(pattern, P.segment)
}

define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => is_match_segment(pattern),
    (pattern: any[]) => {
        return match_segment(pattern[1], pattern[2])
    }
)


export function is_match_reference(pattern: any): boolean {

    return first_equal_with(pattern, P.ref)
}

define_generic_procedure_handler(build_matcher_expr, 
    (pattern: any[]) => is_match_reference(pattern),
    (pattern: any[]) => {
        return match_reference(pattern[1])
    }
)


function is_many(pattern: any): boolean{

    return first_equal_with(pattern, P.many) && pattern.length == 2
}

define_generic_procedure_handler(build_matcher_expr, is_many, 
    (pattern: any[]) => {
        const matcher = pattern[1]
        console.log(matcher)
        
        const expr =  [P.letrec,
            [["repeat", 
                    [P.choose,
                        P.empty,
                        [P.compose,
                            matcher,
                            [P.ref, "repeat"]]]]],
            [P.ref, "repeat"]]

        return build_matcher_expr(expr)
    }
)

export function run_matcher(matcher: matcher_callback, data: any[], succeed: (dict: MatchDict, nEaten: number) => any): MatchDict | MatchFailure {

    return matcher([data], empty_match_dict(), default_match_env(), (dict, nEaten) => {
        return succeed(dict, nEaten)
    })
}


//short-hand interface 


/**
 * Interface representing the result of a successful match.
 */
interface MatchResult {
    dict: MatchDict;  // The dictionary containing matched values.
    eaten: number;    // The number of elements consumed in the match.
}

/**
 * Attempts to match the input array against the provided matcher expression.
 * 
 * @param input - The array of input elements to be matched.
 * @param matcher_expr - The matcher expression defining the pattern to match against.
 * @returns An object containing the match dictionary and the number of elements consumed if successful,
 *          or a MatchFailure object if the match fails.
 */
export function match(input: any[], matcher_expr: string[]): MatchResult | MatchFailure {
    const m = build_matcher_expr(matcher_expr);
    const result = run_matcher(m, input, (dict, e) => { return { dict: dict, eaten: e } });

    if (matchSuccess(result)) {
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
export function try_match(input: any[], matcher_expr: string[]): boolean {
    const result = match(input, matcher_expr);
    if (matchSuccess(result)) {
        return true;
    } else {
        return false;
    }
}


