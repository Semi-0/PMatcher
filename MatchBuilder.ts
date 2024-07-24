import type { matcher_callback, matcher_instance } from "./MatchCallback";
import {match_args} from "generic-handler/Predicates"
import { MatchDict, get_dict_value_sequence, get_raw_entity } from "./MatchDict/MatchDict";
import { is_match_instance } from "./MatchCallback";
import {  match_choose, match_letrec, match_reference, match_new_var, match_compose, match_empty,
    match_element, match_segment, match_wildcard,  match_constant, match_all_other_element, match_begin, match_segment_independently, match_extract_matcher,
    match_map,
    match_with,
    match_transform} from "./MatchCombinator";
import { empty_match_dict } from "./MatchDict/MatchDict";
import {  isString, isMatcher } from "./utility";
import  { match_array } from "./MatchCombinator";
import { inspect } from "util";
import { internal_get_args, internal_get_name, internal_match } from "./MatchCallback";
import { MatchResult } from "./MatchResult/MatchResult"
import { MatchFailure } from "./MatchResult/MatchFailure"; 
import { isSucceed, isFailed } from "./Predicates";
import { first, rest, isPair, isEmpty, isArray, second, third } from "./GenericArray";
import { define_generic_procedure_handler, get_all_critics } from "generic-handler/GenericProcedure";

import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import { default_match_env } from "./MatchEnvironment";
import { v4 as uuidv4 } from 'uuid';
import { DictValue, get_value_sequence } from "./MatchDict/DictValue";
import type { MatchPartialSuccess } from "./MatchResult/PartialSuccess";
import { transform } from "typescript";



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
    extract_matcher: uuidv4(),
    map: uuidv4(),
    with: uuidv4(),
    transform: uuidv4()

}

function translate(array: any[]): any[] {
    const uuidToMatcher = new Map(Object.entries(P).map(([key, value]) => [value, key]));

    return array.map(item => {
        if (Array.isArray(item)) {
            return translate(item);
        } else if (typeof item === 'string' && uuidToMatcher.has(item)) {
            return uuidToMatcher.get(item);
        }
        return item;
    });
}


define_generic_procedure_handler(compile, 
    isArray,
    (pattern: any[]) => {
        return match_array(pattern.map((item: any) => compile(item)))
    }
)


define_generic_procedure_handler(compile,
    is_match_constant,
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
    (pattern: any[]) => {
        return match_all_other_element()
    }
)


function is_empty(pattern: any): boolean{
    return  pattern === P.empty
}

define_generic_procedure_handler(compile,
    is_empty,
    (pattern: any) => {
        return match_empty()
    }
)


export function is_Letrec(pattern: any): boolean {
    return first_equal_with(pattern, P.letrec)
}

define_generic_procedure_handler(compile, 
    is_Letrec,
    (pattern: any[]) => {
        if (pattern.length !== 3) {
            throw Error(`unrecognized pattern in the letrec procedure: ${inspect(pattern)}`)
        }

        const bindings = pattern[1].map((item: any[]) => ({ key: item[0], value: compile(item[1]) }));

        return match_letrec(bindings, compile(pattern[2]))
    }
)


export function is_compose(pattern: any[]): boolean{
    return first_equal_with(pattern, P.compose) 
}

define_generic_procedure_handler(compile,
    is_compose,
    (pattern: any[]) => {
        return match_compose(pattern.slice(1).map((item: any) => compile(item)))
    }
)

export function is_select(pattern: any): boolean {
    return first_equal_with(pattern, P.choose)
}

define_generic_procedure_handler(compile, 
    is_select,
    (pattern: any[]) => {
        return match_choose(pattern.slice(1).map((item: any) => compile(item)))
    }
)


export function is_new_var(pattern: any): boolean {
    return first_equal_with(pattern, P.new)
}

define_generic_procedure_handler(compile, 
    is_new_var,
    (pattern: any[]) => {
        return match_new_var(pattern[1], compile(pattern[2]))
    }
)


function is_match_element(pattern: any): boolean {
   return first_equal_with(pattern, P.element)
}

define_generic_procedure_handler(compile, 
    is_match_element,
    (pattern: any[]) => {
        return match_element(pattern[1], pattern[2])
    }
)


function is_match_segment(pattern: any): boolean {
    return first_equal_with(pattern, P.segment)
}

define_generic_procedure_handler(compile, 
    is_match_segment,
    (pattern: any[]) => {
        return match_segment(pattern[1], pattern[2])
    }
)

function is_segment_independently(pattern: any): boolean {
    return first_equal_with(pattern, P.segment_independently)
}

define_generic_procedure_handler(compile, 
    is_segment_independently,
    (pattern: any[]) => {
        return match_segment_independently(pattern[1], pattern[2])
    }
)


export function is_match_reference(pattern: any): boolean {

    return first_equal_with(pattern, P.ref)
}

define_generic_procedure_handler(compile, 
    is_match_reference,
    (pattern: any[]) => {
        return match_reference(pattern[1])
    }
)


function is_many(pattern: any): boolean{
    return first_equal_with(pattern, P.many) && pattern.length == 2
}

define_generic_procedure_handler(compile, is_many, 
    (pattern: any[]) => {
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
        return compile(expr)
    }
)



/// THIS IS SOOO DUUUMB
export function extract_var_names(pattern: any[]): string[] {
    const names = pattern.flatMap((item: any) => {
        const excluded = get_all_critics(compile).filter((pred: (arg: any) => Boolean) => {
            return pred !== is_match_element && pred !== is_match_segment && pred !== isArray && pred !== is_select && pred !== is_transform
        }).some((pred: (arg: any) => Boolean) => {
            if (pred(item)){
            }
            return pred(item)
        })
        if (excluded){
            return [];
        } 
        else if (is_match_element(item)) {
            return [item[1]];
        } else if (is_match_segment(item)) {
            return [item[1]];
        } else if (is_select(item)){
            const select_item = item.slice(1).flatMap((clause: any[]) => extract_var_names(clause))
            return select_item
        }
        else if (is_transform(item)){
            return extract_var_names([item[2]])
        }
        
        else if (isArray(item)) {
            return extract_var_names(item);
        } else {
            return [];
        }
    });

    // Remove duplicates using Set
    return [...new Set(names)];
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

function is_map(pattern: any): boolean {
    return first_equal_with(pattern, P.map) && pattern.length === 3
}

define_generic_procedure_handler(compile,
    is_map,
    (pattern: any[]) => {
        return match_map(compile(pattern[1]), compile(pattern[2]))
    }
)

function is_with(pattern: any): boolean {
    return first_equal_with(pattern, P.with) && pattern.length === 3 && isArray(pattern[1])
}

define_generic_procedure_handler(compile,
    is_with,
    (pattern: any[]) => {
        return match_with(first(second(pattern)), compile(third(pattern)))
    }
)

function is_transform(pattern: any): boolean {
    // console.log(pattern)
    // if (first(pattern) == P.transform){
    //     console.log(pattern)
    // }
    return first_equal_with(pattern, P.transform) && pattern.length === 3
}

define_generic_procedure_handler(compile,
    is_transform,
    (pattern: any[]) => {
        return match_transform(pattern[1], compile(pattern[2]))
    }
)

// WARNING!!! THIS METHOD IS ONLY FOR USE INTERNALLY, IF CALL FROM OUTSIDE PLEASE USE MATCH FUNCTION INSTEAD
export function run_matcher(matcher: matcher_instance, data: any, succeed: (dict: MatchDict, nEaten: number) => any): any | MatchResult | MatchPartialSuccess | MatchFailure {
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
    const result = run_matcher(m, input, (dict, e) => { return new MatchResult(dict, e) });
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
export function try_match(input: any[], matcher_expr: string[]): boolean {
    const result = match(input, matcher_expr);
    if (isSucceed(result)) {
        return true;
    } else {
        return false;
    }
}



// const result = match(["a", "b", "c"], [P.map, ["a", [P.segment, "rest"]], [P.with, ["rest"], 
//     [P.new, ["x"], [[P.element, "x"], "c"]]]])
// console.log(inspect(result, {showHidden: true, colors: true, depth: 10}))


// const plaindrome = match(["a", "b", "b", "a"], 
//     [P.letrec, [["palindrome",   
//                             [P.choose, 
//                                 [P.new, ["x", "rest"], 
//                                             [P.map, [P.compose, [P.element, "x"], 
//                                                     [P.segment, "rest"], 
//                                                     [P.element, "x"]],
//                                                 [P.with, ["rest"], [[P.ref, "palindrome"]]]],
//                                             ], 
//                                 P.empty,
//                                 []]]],
                                       
//         [[P.ref, "palindrome"]]]
// //     // [[P.element, "x"], [P.segment, "rest"], [P.element, "x"]]
//     )

// console.log(inspect(plaindrome, {showHidden: true, colors: true, depth: 30}))

// const tst_func = (test: number, arg3: number, arg2: number) => {
//     return test + 1
// }

// const func_str = tst_func.toString().split(" ")

// const pattern1 =  ["(", [P.segment, "param"], ","] 
// const pattern2 = [[P.segment, "param"], ","]
// const pattern3 =  [[P.segment, "param"], ")"]

// const result : MatchResult = match(func_str, [P.map, [[P.segment, "params"], "=>", "..."], 
//                                                 [P.with, 
//                                                     ["params"], 
//                                                         [P.many, 
//                                                             [[P.transform, 
//                                                                 (str: string) => {return str.split("")},
//                                                                 [P.choose, pattern1, pattern2, pattern3]]]]]])

// console.log(inspect(result.safeGet("param").map((item: any) => item.join("")), {showHidden: true, colors: true, depth: 30}))

// const param_name = params.forEach((item: string) => {
//     const chars = item.split("")

//     const pattern1 =  ["(", [P.segment, "param"], ","] 
//     const pattern2 = [[P.segment, "param"], ","]
//     const pattern3 =  [[P.segment, "param"], ")"]


//     console.log(match(chars, [P.choose, pattern1, pattern2, pattern3]).safeGet("param").join(""))
// })

// console.log(inspect(params, {showHidden: true, colors: true, depth: 10}))