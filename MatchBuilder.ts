import type { matcher_callback } from "./MatchCallback";
import { MatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import {  match_choose } from "./MatchCombinator";
import { emptyMatchDict } from "./MatchDict";
import { first, rest, isPair, isEmpty, isArray, isString, isMatcher } from "./utility";
import  { match_array } from "./MatchCombinator";
import { inspect } from "util";
import type { MatchFailure } from "./MatchResult";



// expected an array of compose matcher [[a, b, c]] at least 2nd dimension array, because the first array would always be considered as compose matcher
// and the second array sturcture matches that as ["a", "b", "c"]
export function match_builder(matchers: any[]): (data: any[], dict: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any) => any {
    return (data: any[], dict: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any) => {
        const loop = (pattern: any): matcher_callback => {
            if (isArray(pattern)){
                return match_array((pattern as any[]).map((item: any) => loop(item)))
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
            return registed_matchers(data, dict, (dict, nEaten) => {
                return succeed(dict, nEaten)
            })
        } catch (error) {
            console.error("Error during matching:", error);
            return false; // Improved error handling
        }
    }
}

export function run_matcher(matcher: matcher_callback, data: any[], succeed: (dict: MatchDict, nEaten: number) => any): MatchDict | MatchFailure {
    return matcher([data], emptyMatchDict(), (dict, nEaten) => {
        return succeed(dict, nEaten)
    })
}


const match_builder_test = match_builder(["a", [match_constant("b"), match_segment("segment")], "d"])

const result = run_matcher(match_builder_test, ["a", ["b", "c",], "d"], (dict, nEaten) => {
    console.log(`dict: ${inspect(dict)}`)
    console.log(`nEaten: ${nEaten}`)
})

console.log(result)