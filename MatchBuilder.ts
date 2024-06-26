import type { matcher_callback } from "./MatchCallback";
import { MatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import {  match_choose, match_letrec, match_reference, match_new_var } from "./MatchCombinator";
import { emptyMatchDict } from "./MatchDict";
import { first, rest, isPair, isEmptyArray, isArray, isString, isMatcher } from "./utility";
import  { match_array } from "./MatchCombinator";
import { inspect } from "util";
import type { MatchFailure } from "./MatchResult";
import { match_all_other_element } from "./MatchCallback";
import { emptyEnvironment } from "./MatchEnvironment";
import type { MatchEnvironment } from "./MatchEnvironment";

function is_all_other_element(pattern: any): boolean {
    return isString(pattern) && pattern === "..."
}

function is_Letrec(pattern: any): boolean {
    return isPair(pattern) && isString(first(pattern)) && first(pattern) === "m:letrec" 
}

function is_select(pattern: any): boolean {
    return isPair(pattern) && isString(first(pattern)) && first(pattern) === "m:choose" 
}

function is_new_var(pattern: any): boolean {
    return isPair(pattern) && isString(first(pattern)) && first(pattern) === "m:new" 
}

// expected an array of compose matcher [[a, b, c]] at least 2nd dimension array, because the first array would always be considered as compose matcher
// and the second array sturcture matches that as ["a", "b", "c"]
export function match_builder(matchers: any[]): (data: any[], environment: MatchEnvironment, succeed: (environment: MatchEnvironment, nEaten: number) => any) => any {
    return (data: any[], environment: MatchEnvironment, succeed: (environment: MatchEnvironment, nEaten: number) => any) => {

        const pattern_to_binding = (pattern: any[]): {[key: string]: any} => {
            const bindings: {[key: string]: any} = {}
            for (const item of pattern){
                bindings[item[0]] = loop(item[1])
            }
            return bindings
        }

        const loop = (pattern: any): matcher_callback => {
            if (is_Letrec(pattern)){
                if (pattern.length !== 3){
                    throw new Error(`Invalid letrec pattern: ${pattern}`)
                }
                return match_letrec(pattern_to_binding(pattern[1]), loop(pattern[2]))
            }
            else if (is_new_var(pattern)){
                if (pattern.length <= 2){
                    throw new Error(`Invalid new pattern: ${pattern}`)
                }
                return match_new_var(pattern[1], loop(pattern[2]))
            }

            else if (is_select(pattern)){
                if (pattern.length < 2){
                    throw new Error(`Invalid choose pattern: ${pattern}`)
                }
                return match_choose(pattern.slice(1).map((item: any) => loop(item)))
            }
            else if (isArray(pattern)){
                return match_array((pattern as any[]).map((item: any) => loop(item)))
            }
            else if (is_all_other_element(pattern)){
                return match_all_other_element()
            }
            else if (isString(pattern)){
                console.log(`string: ${pattern}`)
                return match_constant(pattern)
            }
            else if (isMatcher(pattern)){
                return pattern
            }
            else {
                throw new Error(`Invalid pattern: ${pattern}`)
            }
        }
        const registed_matchers = loop(matchers)
        try {
            return registed_matchers(data, environment, (environment, nEaten) => {
                return succeed(environment, nEaten)
            })
        } catch (error) {
            console.error("Error during matching:", error);
            return false; // Improved error handling
        }
    }
}

export function run_matcher(matcher: matcher_callback, data: any[], succeed: (environment: MatchEnvironment, nEaten: number) => any): MatchEnvironment | MatchFailure {
    return matcher([data], emptyEnvironment(), (environment, nEaten) => {
        return succeed(environment, nEaten)
    })
}


const match_builder_test = match_builder(["m:letrec",
                                         [["palindrome", ["m:new", ["x"] ,
                                                        ["m:choose", [], [match_element("x"), 
                                                                          match_reference("palindrome"),
                                                                          match_element("x")]]]]], 
                                         [match_reference("palindrome")]])

const result = run_matcher(match_builder_test, [["a", ["b", [] , "b"], "a"]], (environment, nEaten) => {
    console.log(`environment: ${inspect(environment)}`)
    console.log(`nEaten: ${nEaten}`)
})

console.log(result)