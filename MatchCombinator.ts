import { MatchDict, emptyMatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import type { matcher_callback } from "./MatchCallback";
import { inspect } from "util";
import { first, rest, isPair, isEmptyArray } from "./utility";
import { createMatchFailure, FailedMatcher, FailedReason } from "./MatchResult";
import { matchSuccess, isMatchFailure } from "./MatchResult";
import type { MatchEnvironment } from "./MatchEnvironment";

// match_element match_segment match_compose(match_constant, match_segment))



export function match_array(all_matchers: matcher_callback[]) : matcher_callback {
    return (data: any[], dictionary: MatchEnvironment, succeed: (dictionary: MatchEnvironment, nEaten: number) => any): any => {
        const detailizeInfoWhenError = (result: any, position: number) => {
            // LIMITIONS: WOULD BACKTRACK ALL ERRORS WHEN ERROR OCCURS TODO: IMPROVE IT
            if (isMatchFailure(result)) {
                return createMatchFailure(FailedMatcher.Array, FailedReason.UnexpectedInput, data, position, result)
            }
            else{
                return result
            }
        }
        
        
        const loop = (data_list: any[], matchers: matcher_callback[], dictionary: MatchEnvironment): any => {
        
                // const matcher = matchers[matcher_index];
            if (isPair(matchers)){
                const matcher = first(matchers)
                const result = matcher(data_list, dictionary, (new_dict: MatchEnvironment, nEaten: number) => {
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
                // console.log("success empty")
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
            return loop(first(data), all_matchers, dictionary)
        }
    };
}


export function match_choose(matchers: matcher_callback[]): matcher_callback {
    return (data: any[], dictionary: MatchEnvironment, succeed: (dictionary: MatchEnvironment, nEaten: number) => any): any => {
        for (const matcher of matchers) {
            const result = matcher(data, dictionary, succeed)
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
    return (data: any[], dictionary: MatchEnvironment, succeed: (dictionary: MatchEnvironment, nEaten: number) => any): any => {
        const matcher = dictionary.get(reference_symbol)
        if (data === undefined || data === null || typeof data === "string") {
            return createMatchFailure(FailedMatcher.Reference, FailedReason.UnexpectedEnd, data, 0, null)
        }
        else if (matcher) {
            const result = matcher(data, dictionary, succeed)

            if (matchSuccess(result)) {
                return result
            }
            else{
                console.log("reference failed")
                return createMatchFailure(FailedMatcher.Reference, FailedReason.UnexpectedEnd, data, 0, result)
            }
        }
        else{
            console.log("reference not found")
            return createMatchFailure(FailedMatcher.Reference, FailedReason.ReferenceNotFound, data, 0, null)
        }
    }
}

export function match_letrec(bindings: {[key: string]: matcher_callback}, body: matcher_callback): matcher_callback {
    return (data: any[], dictionary: MatchEnvironment, succeed: (dictionary: MatchEnvironment, nEaten: number) => any): any => {
        const extended_dict = Object.entries(bindings).reduce((acc, [key, value]) => {
            return acc.extend(key, value)
        }, dictionary.spawnChild())
        return body(data, extended_dict, succeed)
        
    }
}

