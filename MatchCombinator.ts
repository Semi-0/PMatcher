import { MatchDict, empty_match_dict } from "./MatchDict/MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import type { matcher_callback } from "./MatchCallback";
import { inspect } from "util";
import { first, rest, isPair, isEmptyArray } from "./utility";
import { createMatchFailure, FailedMatcher, FailedReason } from "./MatchResult";
import { matchSuccess, isMatchFailure } from "./MatchResult";
import type { MatchFailure } from "./MatchResult";
import type { ScopeReference } from "./MatchDict/ScopeReference";
import { extend, get_value } from "./MatchDict/DictInterface";
import { default_match_env, get_current_scope, type MatchEnvironment } from "./MatchEnvironment";
import { new_ref } from "./MatchDict/ScopeReference";
import { construct_dict_value } from "./MatchDict/DictValue";
// match_element match_segment match_compose(match_constant, match_segment))
import { is_will_define, will_define } from "./MatchDict/DictValue";


// const match_comp = match_compose([match_element("a"), match_constant("b")])

// const rs = match_comp(["a", "b"], empty_match_dict(), default_match_env(), (dict, eaten) => {return dict})
// console.log(rs)


export function match_compose(matchers: matcher_callback[]) : matcher_callback{
    return (data: any[], dictionary: MatchDict , match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        
        const handleMatchError = (result: any, position: number) => {
            // LIMITIONS: WOULD BACKTRACK ALL ERRORS WHEN ERROR OCCURS TODO: IMPROVE IT
            if (isMatchFailure(result)) {
                return createMatchFailure(FailedMatcher.Compose, FailedReason.UnexpectedInput, data, position, result)
            }
            else{
                return result
            }
        }
        
        
        const loop = (data_list: any[], matchers: matcher_callback[], dictionary: MatchDict, eaten: number): any => {

            if (isPair(matchers)){

                const matcher = first(matchers)
                const result = matcher(data_list, dictionary, match_env, (new_dict: MatchDict, nEaten: number) => {
                    return loop(data_list.slice(nEaten), rest(matchers), new_dict, eaten + nEaten);
                });
  
                return handleMatchError(result, matchers.findIndex((m) => m === matcher));
            }
            else if (isPair(data_list)){
               return createMatchFailure(FailedMatcher.Compose, 
                                         FailedReason.UnConsumedInput, 
                                         data_list, 0, null)  
            } 
            else if (isEmptyArray(data_list)){
                return succeed(dictionary, eaten)
            }
            else{
                return createMatchFailure(FailedMatcher.Compose, 
                                         FailedReason.UnexpectedEnd, 
                                         data_list, 0, null)
            }

        };
        return loop(data, matchers, dictionary, 0)
    }
}

export function match_array(all_matchers: matcher_callback[]) : matcher_callback {
    return (data: any[], dictionary: MatchDict , match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const compose_matcher = match_compose(all_matchers)

        if (data === undefined || data === null) {
            return createMatchFailure(FailedMatcher.Array, FailedReason.UnexpectedEnd, data, 0, null)
        }
        else if  (isEmptyArray(data)) {
            return succeed(dictionary, 0)
        }
        else{
            const result = compose_matcher(first(data), dictionary, match_env, (dict: MatchDict, nEaten: number) => {return dict})
       
            
            if (matchSuccess(result)){
                // @ts-ignore
                return succeed(result,1)
            }
            else{
                return result 
            }
        }
    };
}


export function match_choose(matchers: matcher_callback[]): matcher_callback {
    return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        for (const matcher of matchers) {
            const result = matcher(data, dictionary, match_env, succeed)
            var failures = []
            // console.log("choose matcher", matcher.toString(), "result", result)
            if (matchSuccess(result)) {
                return result
            }
            else{
                failures.push(result)
            }
        }

        return createMatchFailure(FailedMatcher.Choice, 
                                  FailedReason.UnexpectedEnd, 
                                  ["matched len:" + matchers.length,data, failures], matchers.length, null)
    }
}


export function match_reference(reference_symbol: string): matcher_callback{
    return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const matcher = get_value({key: reference_symbol,
                                   matchEnv: match_env},
                                   dictionary)
        if (data === undefined || data === null ) {
            return createMatchFailure(FailedMatcher.Reference, FailedReason.UnexpectedEnd, data, 0, null)
        }
        else if (matcher) {
            const result = matcher(data, dictionary, match_env, succeed)
    
            if (matchSuccess(result)) {
                return result
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
    return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const new_env_ref: ScopeReference = new_ref()
        const new_env = extend(new_env_ref, match_env)
        
        const extended_dict = bindings.reduce((acc, binding) => {
            return extend({key: binding.key,
                           value: binding.value,
                           scopeRef: new_env_ref},
                           acc)
        }, dictionary)
        
        return body(data, extended_dict, new_env, succeed)
    }
}

export function match_new_var(names: string[], body: matcher_callback): matcher_callback {
    return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const new_env_ref: ScopeReference = new_ref()
        const new_env = extend(new_env_ref, match_env)
        
        const extended_dict = names.reduce((acc, name) => {
            return extend({key: name,
                           value: will_define,
                           scopeRef: new_env_ref},
                          acc)
        }, dictionary)
        
        return body(data, extended_dict, new_env, succeed)
    }
}

// export function match_new_obj(name: string, body: matcher_callback): matcher_callback{
//     return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
//         const new_env_ref: ScopeReference = new_ref()
//         // const new_env = extend(new_env_ref, match_env)
        
//         // const extended_dict = names.reduce((acc, name) => {
//         //     return extend({key: name,
//         //                    value: will_define,
//         //                    scopeRef: new_env_ref},
//         //                   acc)
//         // }, dictionary)
        
//         const result = body(data, new MatchDict(), [new_env_ref], (dict, eaten) => { return {dict, eaten} })

//         if (isMatchFailure(result)){
//             return result 
//         }
//         else{
//             const {dict, eaten} = result
//             const extended_dict = extend({key: name, 
//                                           value: construct_dict_value(dict, 
//                                                                     get_current_scope(match_env))},
//                                           dictionary)                      
//             succeed(extended_dict, eaten)
//         }

//     }
// }

