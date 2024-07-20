import type { matcher_callback, matcher_instance } from "./MatchCallback";
import {match_args} from "generic-handler/Predicates"
import { MatchDict, get_dict_value_sequence, get_raw_entity } from "./MatchDict/MatchDict";
import { is_match_instance } from "./MatchCallback";
import {  match_choose, match_letrec, match_reference, match_new_var, match_compose, match_empty,
    match_element, match_segment, match_wildcard,  match_constant, match_all_other_element, match_begin, match_segment_independently, match_extract_matcher} from "./MatchCombinator";
import { empty_match_dict } from "./MatchDict/MatchDict";
import { first, rest, isPair, isEmptyArray, isArray, isString, isMatcher } from "./utility";
import  { match_array } from "./MatchCombinator";
import { inspect } from "util";
import { internal_get_args, internal_get_name, internal_match } from "./MatchCallback";
import { MatchResult } from "./MatchResult/MatchResult"
import { MatchFailure } from "./MatchResult/MatchFailure"; 
import { isSucceed, isFailed } from "./predicates";

import { define_generic_procedure_handler, get_all_critics } from "generic-handler/GenericProcedure";

import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import { default_match_env } from "./MatchEnvironment";
import { v4 as uuidv4 } from 'uuid';
import { DictValue, get_value_sequence } from "./MatchDict/DictValue";
import type { MatchPartialSuccess } from "./MatchResult/PartialSuccess";



export const compile = construct_simple_generic_procedure("compile", 1,
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
    segment_independently: uuidv4(),
    ref: uuidv4(),
    constant: uuidv4(),
    many: uuidv4(),
    compose: uuidv4(),
    empty: uuidv4(),
    wildcard: uuidv4(),
    extract_var_names: uuidv4(),
    begin: uuidv4(),
    extract_matcher: uuidv4()
}


define_generic_procedure_handler(compile, 
    isArray,
    (pattern: any[]) => {
        return match_array(pattern.map((item: any) => compile(item)))
    }
)


define_generic_procedure_handler(compile,
    is_match_constant,
    (pattern: any, opt) => {
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




export function is_match_constant(pattern: any): boolean {
    return first_equal_with(pattern, P.constant) || isString(pattern)
}

export function first_equal_with(pattern: any, value: any): boolean {
    return isPair(pattern) && isString(first(pattern)) && first(pattern) === value
}



function is_all_other_element(pattern: any): boolean {
    return isString(pattern) && pattern === "..."
}

define_generic_procedure_handler(compile, 
    is_all_other_element,
    (pattern: any[], opt) => {
        return match_all_other_element()
    }
)


function is_empty(pattern: any): boolean{
    return  pattern === P.empty
}

define_generic_procedure_handler(compile,
    is_empty,
    (pattern: any, opt) => {
        return match_empty()
    }
)


export function is_Letrec(pattern: any): boolean {
    return first_equal_with(pattern, P.letrec)
}

define_generic_procedure_handler(compile, 
    is_Letrec,
    (pattern: any[], opt) => {
        if (pattern.length !== 3) {
            throw Error(`unrecognized pattern in the letrec procedure: ${inspect(pattern)}`)
        }

        const bindings = pattern[1].map((item: any[]) => ({ key: item[0], value: compile(item[1], opt) }));

        return match_letrec(bindings, compile(pattern[2], opt))
    }
)


export function is_compose(pattern: any[]): boolean{
    return first_equal_with(pattern, P.compose) 
}

define_generic_procedure_handler(compile,
    is_compose,
    (pattern: any[], opt) => {
        return match_compose(pattern.slice(1).map((item: any) => compile(item, opt)))
    }
)

export function is_select(pattern: any): boolean {
    return first_equal_with(pattern, P.choose)
}

define_generic_procedure_handler(compile, 
    is_select,
    (pattern: any[], opt) => {
        return match_choose(pattern.slice(1).map((item: any) => compile(item, opt)))
    }
)


export function is_new_var(pattern: any): boolean {
    return first_equal_with(pattern, P.new)
}

define_generic_procedure_handler(compile, 
    is_new_var,
    (pattern: any[], opt) => {
        return match_new_var(pattern[1], compile(pattern[2], opt))
    }
)


function is_match_element(pattern: any): boolean {
   return first_equal_with(pattern, P.element)
}

define_generic_procedure_handler(compile, 
    is_match_element,
    (pattern: any[], opt) => {
        return match_element(pattern[1], pattern[2])
    }
)


function is_match_segment(pattern: any): boolean {
    return first_equal_with(pattern, P.segment)
}

define_generic_procedure_handler(compile, 
    is_match_segment,
    (pattern: any[], opt) => {
        return match_segment(pattern[1], pattern[2])
    }
)

function is_segment_independently(pattern: any): boolean {
    return first_equal_with(pattern, P.segment_independently)
}

define_generic_procedure_handler(compile, 
    is_segment_independently,
    (pattern: any[], opt) => {
        return match_segment_independently(pattern[1], pattern[2])
    }
)


export function is_match_reference(pattern: any): boolean {

    return first_equal_with(pattern, P.ref)
}

define_generic_procedure_handler(compile, 
    is_match_reference,
    (pattern: any[], opt) => {
        return match_reference(pattern[1])
    }
)


function is_many(pattern: any): boolean{
    return first_equal_with(pattern, P.many) && pattern.length == 2
}

define_generic_procedure_handler(compile, is_many, 
    (pattern: any[], opt) => {
        const matcher = pattern[1]
        const vars = extract_var_names(matcher)
        const expr =  [P.letrec,
            [["repeat", 
                [P.new, vars,
                    [P.choose,
                        P.empty,
                        [P.compose,
                            ...matcher,
                            [P.ref, "repeat"]]]]]],
            [[P.ref, "repeat"]]]

        return compile(expr, opt)
    }
)



/// THIS IS SOOO DUUUMB
export function extract_var_names(pattern: any[]): string[] {

    return pattern.flatMap((item: any) => {
        const excluded = get_all_critics(compile).filter((pred: (arg: any) => Boolean) => {
            return pred !== is_match_element && pred !== is_match_segment && pred !== isArray
        }).some((pred: (arg: any) => Boolean) => {
            return pred(item)
        })
        if (excluded){
            return [];
        } 
        else if (is_match_element(item)) {
            return [item[1]];
        } else if (is_match_segment(item)) {
            return [item[1]];
        } else if (isArray(item)) {
            return extract_var_names(item);
        } else {
            return [];
        }
    });
}

function is_extract_var_names(pattern: any): boolean {
    return first_equal_with(pattern, P.extract_var_names)
}

define_generic_procedure_handler(compile, 
     is_extract_var_names,
    (pattern: any[]) => {
        return extract_var_names(pattern[1])
    }
)


function is_wildcard(pattern: any): boolean {
    return pattern === P.wildcard 
}

define_generic_procedure_handler(compile, 
    is_wildcard,
    (pattern: any[]) => {
        return match_wildcard()
    }
)

function is_begin(pattern: any): boolean {
    return first_equal_with(pattern, P.begin)
}

define_generic_procedure_handler(compile,
    is_begin,
    (pattern: any[]) => {
        return match_begin(pattern.slice(1).map((item: any) => compile(item)))
    }
)

function is_extract_matcher(pattern: any): boolean {
    return first_equal_with(pattern, P.extract_matcher) && pattern.length === 3
}

define_generic_procedure_handler(compile,
    is_extract_matcher,
    (pattern: any[]) => {
        const matcher_name = pattern[1]
        const matcher_expr = pattern[2]
        return match_extract_matcher(matcher_name, compile(matcher_expr))
    }
)

define_generic_procedure_handler(compile,
    is_match_instance,
    (pattern: any[]) => {
        return pattern
    }
)




export function run_matcher(matcher: matcher_instance, data: any[], succeed: (dict: MatchDict, nEaten: number) => any): any | MatchResult | MatchPartialSuccess | MatchFailure {
    return internal_match(matcher, [data], empty_match_dict(), default_match_env(), (dict, nEaten) => {
        return succeed(dict, nEaten)
    })
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
export function match(input: any[], matcher_expr: any[]): any | MatchResult | MatchPartialSuccess | MatchFailure {
    const m = compile(matcher_expr);

    const result = internal_match(m, input, empty_match_dict(), default_match_env(), (dict, e) => { return new MatchResult(dict, e) });

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
export function try_match(input: any[], matcher_expr: string[]): boolean {
    const result = match(input, matcher_expr);
    if (isSucceed(result)) {
        return true;
    } else {
        return false;
    }
}