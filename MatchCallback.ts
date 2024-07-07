import { get_value } from "./MatchDict/DictInterface";
import { DictValue, construct_dict_value, extend_new_value_in_scope, is_empty_dict_value, is_will_define } from "./MatchDict/DictValue";
import { MatchDict } from "./MatchDict/MatchDict";
import type { ScopeReference } from "./MatchDict/ScopeReference";
import type { MatchFailure } from "./MatchResult";
import { createMatchFailure } from "./MatchResult";
import { FailedMatcher, FailedReason } from "./MatchResult";
import { matchSuccess } from "./MatchResult";
import { extend } from "./MatchDict/DictInterface"
import { get_current_scope, type MatchEnvironment } from "./MatchEnvironment";

export type matcher_callback =  (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any) => any
// needs more precise error handler
// TODO: Support Any Type Done  
// TODO: Composable Matcher Done
// TODO: Match in nested list
// TODO: Match with compiling pattern



export function match_constant(pattern_constant: string): matcher_callback {
    return (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any  => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(FailedMatcher.Constant, 
                                      FailedReason.UnexpectedEnd, 
                                      data, 0, null);
        }
        if (data[0] === pattern_constant) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(FailedMatcher.Constant, 
                                      FailedReason.UnexpectedInput, 
                                      [data[0], pattern_constant], 0, null);
        }
    };
}

export function match_element(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_callback {
    return (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (environment: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(FailedMatcher.Element, 
                                      FailedReason.UnexpectedEnd, 
                                      data, 0, null);
        }
        const binding_value = get_value({key: variable, matchEnv: matchEnv}, dictionary)
        const current_scope_ref = get_current_scope(matchEnv)
        if (!restriction(data[0])){
            return createMatchFailure(FailedMatcher.Element, 
                                      FailedReason.RestrictionUnmatched, 
                                      data[0], 0, null);
        }

        if (is_will_define(binding_value, current_scope_ref)) {
            const extended = extend({key: variable, 
                                     value: extend_new_value_in_scope(data[0],
                                                                      current_scope_ref,
                                                                      binding_value)},
                                     dictionary);

            return succeed(extended, 1);
        }
        else if ((binding_value === undefined) || (binding_value === null)){
            const current_env = get_current_scope(matchEnv)
            const extended = extend({key: variable,
                                     value: construct_dict_value(data[0],
                                                                 current_env)},
                                     dictionary);
            return succeed(extended, 1)
        }
        
        else if (binding_value === data[0]) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(FailedMatcher.Element,
                                      FailedReason.BindingValueUnmatched, 
                                      data[0], 0, null);
        }
    };
}

export function match_segment(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_callback {

    const loop = (index: number, data: any[], dictionary: MatchDict, extend_method: (data: any) => MatchDict,  succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        
        if (index >= data.length) {
            return createMatchFailure(FailedMatcher.Segment, 
                                      FailedReason.IndexOutOfBound, 
                                      data, index, null);
        }
        if (!restriction(data[index])){
            return createMatchFailure(FailedMatcher.Segment, 
                                      FailedReason.RestrictionUnmatched, 
                                      data[index], index, null);
        }

        const result = succeed(extend_method(data.slice(0, index + 1)), index + 1);

        if (matchSuccess(result)) {
            return result;
        }
        return loop(index + 1, data, dictionary, extend_method, succeed);
    };

    const match_segment_equal = (data: any[], value: any[], ok: (i: number) => any): any => {
        for (let i = 0; i < data.length; i++) {
            if (data[i] !== value[i]) {
                return createMatchFailure(FailedMatcher.Segment, 
                                          FailedReason.BindingValueUnmatched, 
                                          data[i], i, null);
            }
            if (!restriction(data[i])){
                return createMatchFailure(FailedMatcher.Segment, 
                                          FailedReason.RestrictionUnmatched, 
                                          data[i], i, null);
            }
        }
        return ok(data.length);
    };

    return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(FailedMatcher.Segment, 
                                      FailedReason.UnexpectedEnd, 
                                      data, 0, null);
        }

        const binding = get_value({key: variable, 
                                   matchEnv: match_env},
                                   dictionary);

        const current_env = get_current_scope(match_env)
        if (binding === undefined || binding === null) {
            return loop(0, 
                        data, 
                        dictionary, 
                        (data: any) => {
                            return extend({key: variable,
                                           value: construct_dict_value(data, get_current_scope(match_env))},
                                           dictionary)
                        },
                        succeed);
        } 
        else if (is_will_define(binding, current_env)){
            return loop(1, 
                        data, 
                        dictionary, 
                        (data: any) => {
                            return extend({key: variable,
                                           value: extend_new_value_in_scope(data, current_env, binding)},
                                           dictionary)
                        },
                        succeed);
        } 
        else {
            return match_segment_equal(data, binding, (i) => succeed(dictionary, i));
        }
    };
}

export function match_segment_independently(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_callback {
    const match_segment_all_impl = match_segment(variable, restriction)
    return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        return match_segment_all_impl(data, dictionary, match_env, (new_dict: MatchDict, nEaten: number) => {
            if (nEaten == data.length) {
                return succeed(new_dict, nEaten);
            }
            else{
                return createMatchFailure(FailedMatcher.Segment, FailedReason.ToContinue, data, nEaten, null)
            }
        })
    }
}
export function match_all_other_element(): matcher_callback {
  
    return (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {  
        const loop = (index: number, data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
            if (index >= data.length) {
                return succeed(dictionary, 0);
            }
            
            if (data === undefined || data === null || data.length === 0) {
                return succeed(dictionary, 0);
            }

            const result = succeed(dictionary, index + 1);

            if (matchSuccess(result)) {
                return result;
            }
            else{
                return loop(index + 1, data, dictionary, succeed);
            }
        
        };
        return loop(0, data, dictionary, succeed);
    }
}

