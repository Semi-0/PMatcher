import { MatchDict, empty_match_dict } from "./MatchDict/MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import type { matcher_callback } from "./MatchCallback";
import { inspect } from "util";
import { first, rest, isPair, isEmptyArray } from "./utility";
import { createMatchFailure, FailedMatcher, FailedReason } from "./MatchResult";
import { matchSuccess, isMatchFailure } from "./MatchResult";
import type { MatchFailure } from "./MatchResult";
import type { ScopeReference } from "./MatchDict/ScopeReference";
import { get_value } from "./MatchDict/DictInterface";

// match_element match_segment match_compose(match_constant, match_segment))



export function match_array(all_matchers: matcher_callback[]) : matcher_callback {
    return (data: any[], dictionary: MatchDict , environment_reference: ScopeReference, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const detailizeInfoWhenError = (result: any, position: number) => {
            // LIMITIONS: WOULD BACKTRACK ALL ERRORS WHEN ERROR OCCURS TODO: IMPROVE IT
            if (isMatchFailure(result)) {
                return createMatchFailure(FailedMatcher.Array, FailedReason.UnexpectedInput, data, position, result)
            }
            else{
                return result
            }
        }
        
        
        const loop = (data_list: any[], matchers: matcher_callback[], dictionary: MatchDict): any => {
                // const matcher = matchers[matcher_index];
            if (isPair(matchers)){

                const matcher = first(matchers)
                const result = matcher(data_list, dictionary, environment_reference, (new_dict: MatchDict, nEaten: number) => {
                    console.log("dictionary_array", dictionary)
                    console.log("new_dict", new_dict)
                    // console.log("dict:", dictionary)
                    return loop(data_list.slice(nEaten), rest(matchers), new_dict);
                });
                // console.log("success matcher:" + matcher.toString())
                return detailizeInfoWhenError(result, all_matchers.findIndex((m) => m === matcher));
            }
             else if (isPair(data_list)){
               return createMatchFailure(FailedMatcher.Array, 
                                         FailedReason.UnConsumedInput, 
                                         data_list, 0, null)  
            } 
            else if (isEmptyArray(data_list)){
                console.log("success empty")
                return succeed(dictionary, 1)
            }
            else{
                return createMatchFailure(FailedMatcher.Array, 
                                         FailedReason.UnexpectedEnd, 
                                         data_list, 0, null)
            }

        };

        if (data === undefined || data === null) {
            return createMatchFailure(FailedMatcher.Array, FailedReason.UnexpectedEnd, data, 0, null)
        }
        else if  (isEmptyArray(data)) {
            return succeed(dictionary, 0)
        }
        else{
            // console.log("loop", first(data), all_matchers, dictionary)
            return loop(first(data), all_matchers, dictionary)
        }
    };
}


export function match_choose(matchers: matcher_callback[]): matcher_callback {
    return (data: any[], dictionary: MatchDict, environment_reference: ScopeReference, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        for (const matcher of matchers) {
            const result = matcher(data, dictionary, environment_reference, succeed)
            // console.log("choose matcher", matcher.toString(), "result", result)
            if (matchSuccess(result)) {
                return result
            }
        }

        return createMatchFailure(FailedMatcher.Choice, 
                                  FailedReason.UnexpectedEnd, 
                                  data, matchers.length, null)
    }
}


export function match_reference(reference_symbol: string): matcher_callback{
    return (data: any[], dictionary: MatchDict, environment_reference: ScopeReference, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const matcher = get_value()
        if (data === undefined || data === null || typeof data === "string") {
            return createMatchFailure(FailedMatcher.Reference, FailedReason.UnexpectedEnd, data, 0, null)
        }
        else if (matcher) {
            const result = matcher(data, dictionary, succeed)
            console.log("reference success", result)
            if (matchSuccess(result)) {
                return succeed(dictionary, 1) 
            }
            else{
                return createMatchFailure(FailedMatcher.Reference, FailedReason.UnexpectedEnd, data, 0, result)
            }
        }
        else{
            return createMatchFailure(FailedMatcher.Reference, FailedReason.ReferenceNotFound, data, 0, null)
        }
    }
}

export function match_letrec(bindings: {key: string, value: matcher_callback}[], body: matcher_callback): matcher_callback {
    return (data: any[], dictionary: MatchEnvironment, succeed: (dictionary: MatchEnvironment, nEaten: number) => any): any => {
        const extended_dict = bindings.reduce((acc, binding) => {
            return acc.extend(binding.key, binding.value)
        }, dictionary.spawnChild())
        console.log("extended_dict", extended_dict)
        return body(data, extended_dict, succeed)
    }
}

export function match_new_var(name: string[], body: matcher_callback): matcher_callback {
    return (data: any[], dictionary: MatchEnvironment, succeed: (dictionary: MatchEnvironment, nEaten: number) => any): any => {
        const new_dict = name.reduce((acc, n) => acc.extend(n, undefined), dictionary.spawnChild())
        console.log("new_dict", new_dict)
        return body(data, new_dict, succeed)
    }
}


export function match_repeated_patterns(pattern: matcher_callback): matcher_callback {
    return (data: any[], environment: MatchEnvironment, succeed: (environment: MatchEnvironment, nEaten: number) => any): any => {
        const loop = (data: any[], environment: MatchEnvironment, succeed: (dictenvironmentionary: MatchEnvironment, nEaten: number) => any, eaten: number): any =>   {
            console.log(data)
            const notConsumed = isPair(data)
            if (notConsumed){
                const result = pattern(data, emptyEnvironment(), (new_dict: MatchEnvironment, nEaten: number) => {
                    return loop(data.slice(nEaten), new_dict.merge_environment(environment), succeed, eaten + 1)
                })
              
                if (matchSuccess(result)) {
                    return result
                }
                else{
                    return createMatchFailure(FailedMatcher.Repeated, FailedReason.UnexpectedEnd, data, 0, result)
                }
            }
            else{
                return succeed(environment, eaten)
            }
        }

        return loop(data, environment, succeed, 0)
    }
}


const matcher = match_repeated_patterns(match_array([match_element("a"), match_element("b")]))

const result = matcher([["1", "2"], ["2", "3"], ["2", "3"], ["2", "3"], ["2", "3"]], emptyEnvironment(), (dict, n) => {
    return {new_dict: dict, nEaten: n}
})

console.log(result)