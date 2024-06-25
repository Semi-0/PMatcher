import { MatchDict, emptyMatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import type { matcher_callback } from "./MatchCallback";
import { inspect } from "util";
import { first, rest, isPair, isEmpty } from "./utility";
import { createMatchFailure, FailedMatcher, FailedReason } from "./MatchResult";
import { matchSuccess, isMatchFailure } from "./MatchResult";

// match_element match_segment match_compose(match_constant, match_segment))



export function match_array(all_matchers: matcher_callback[]) : matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const detailizeInfoWhenError = (result: any, position: number) => {
            // LIMITIONS: WOULD BACKTRACK ALL ERRORS WHEN ERROR OCCURS TODO: IMPROVE IT
            if (isMatchFailure(result)) {
                return createMatchFailure(FailedMatcher.Array, FailedReason.UnexpectedInput, data, position, [result])
            }
            else{
                return result
            }
        }
        
        
        const loop = (data_list: any[], matchers: matcher_callback[], dictionary: MatchDict): any => {
        
                // const matcher = matchers[matcher_index];
            if (isPair(matchers)){
                const matcher = first(matchers)
                const result = matcher(data_list, dictionary, (new_dict: MatchDict, nEaten: number) => {
                    return loop(data_list.slice(nEaten), rest(matchers), new_dict);
                });
                return detailizeInfoWhenError(result, all_matchers.findIndex((m) => m === matcher));
            }
             else if (isPair(data_list)){
               return createMatchFailure(FailedMatcher.Array, 
                                         FailedReason.UnConsumedInput, 
                                         data_list, 0, null)  
            } 
            else if (isEmpty(data_list)){
                return succeed(dictionary, 1)
            }
            else{
                return createMatchFailure(FailedMatcher.Array, 
                                         FailedReason.UnexpectedEnd, 
                                         data_list, 0, null)
            }

        };
        
        if  (!isPair(data)) {
            return createMatchFailure(FailedMatcher.Array, 
                                         FailedReason.UnexpectedInput, 
                                         data, 0, null)
        }
        else{
            return loop(first(data), all_matchers, dictionary)
        }
    };
}


export function match_choose(matchers: matcher_callback[]): matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        for (const matcher of matchers) {
            const result = matcher(data, dictionary, succeed)
            if (matchSuccess(result)) {
                return result
            }
        }
        return createMatchFailure(FailedMatcher.Choice, 
                                  FailedReason.UnexpectedEnd, 
                                  data, 0, null)
    }
}



