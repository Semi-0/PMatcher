import { MatchDict, empty_match_dict, get_raw_entity } from "./MatchDict/MatchDict";
import type { matcher_callback } from "./MatchCallback";
import { inspect } from "util";
import { first, rest, isPair, isEmptyArray } from "./utility";
import type { ScopeReference } from "./MatchDict/ScopeReference";
import { extend, get_value } from "./MatchDict/DictInterface";
import { default_match_env, get_current_scope, type MatchEnvironment } from "./MatchEnvironment";
import { new_ref } from "./MatchDict/ScopeReference";
import { construct_dict_value } from "./MatchDict/DictValue";
// match_element match_segment match_compose(match_constant, match_segment))
import { is_will_define, will_define } from "./MatchDict/DictValue";
import type { matcher_instance } from "./MatchCallback";
import { createMatchFailure } from "./MatchResult/MatchFailure";
import { createMatcherInstance, internal_match, internal_get_name } from "./MatchCallback";
import { MatcherName } from "./NameDict";
import { FailedReason } from "./MatchResult/MatchFailure";
import { equal } from "./utility";
import { isFailed, isSucceed } from "./predicates";
import { createMatchPartialSuccess } from "./MatchResult/PartialSuccess";
// const match_comp = match_compose([match_element("a"), match_constant("b")])

// const rs = match_comp(["a", "b"], empty_match_dict(), default_match_env(), (dict, eaten) => {return dict})
// console.log(rs)
export function match_constant(pattern_constant: string): matcher_instance {
    const proc =  (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any  => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(MatcherName.Constant, 
                                      FailedReason.UnexpectedEnd, 
                                      data, null);
        }
        if (equal(data[0], pattern_constant)) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(MatcherName.Constant, 
                                      FailedReason.UnexpectedInput, 
                                      [data[0], pattern_constant], null);
        }
    };
    return createMatcherInstance(MatcherName.Constant, proc, new Map<string, any>([
        ["constant", pattern_constant]
    ]))
}

export function match_wildcard(): matcher_instance {
    const proc = (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any  => {
        return succeed(dictionary, 1);
    }
    return createMatcherInstance(MatcherName.Wildcard, proc)
}

export function match_empty(): matcher_instance{
    const proc = (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any  => {
        if (data.length === 0){
            return succeed(dictionary, 0)
        }
        else{
            return createMatchFailure(MatcherName.Empty,
                                      FailedReason.UnexpectedInput,
                                      data, null)

        }
    }
    return createMatcherInstance(MatcherName.Empty, proc)
}

export function match_element(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_instance {
    const proc = (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (environment: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(MatcherName.Element, 
                                      FailedReason.UnexpectedEnd, 
                                      data, null);
        }
        const binding_value = get_value({key: variable, matchEnv: matchEnv}, dictionary)
        const current_scope_ref = get_current_scope(matchEnv)
        if (!restriction(data[0])){
            return createMatchFailure(MatcherName.Element, 
                                      FailedReason.RestrictionUnmatched, 
                                      data[0], null);
        }
        else if ((binding_value === undefined) || (binding_value === null)){
            const current_env = get_current_scope(matchEnv)
            const extended = extend({key: variable,
                                     value: construct_dict_value(data[0],
                                                                 current_env)},
                                     dictionary);
            return succeed(extended, 1)
        }
        else if (is_will_define(binding_value, current_scope_ref)) {
                const extended = extend({key: variable, 
                                         value: data[0],
                                         scopeRef: current_scope_ref},
                                         dictionary);

                return succeed(extended, 1);
            }
        
        
        
        
        else if (equal(binding_value, data[0])) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(MatcherName.Element,
                                      FailedReason.BindingValueUnmatched, 
                                      data[0], null);
        }
    };
    return createMatcherInstance(MatcherName.Element, proc, new Map<string, string | ((value: any) => boolean)>([
        ["var", variable],
        ["restriction", restriction]
    ]))
}

export function match_segment(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_instance {

    const loop = (index: number, data: any[], dictionary: MatchDict, extend_method: (data: any) => MatchDict,  succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (index >= data.length) {
            return createMatchFailure(MatcherName.Segment, 
                                      FailedReason.IndexOutOfBound, 
                                      data, null);
        }
        if (!restriction(data[index])){
            return createMatchFailure(MatcherName.Segment, 
                                      FailedReason.RestrictionUnmatched, 
                                      data[index], null);
        }

        const result = succeed(extend_method(data.slice(0, index + 1)), index + 1);

        if (isSucceed(result)) {
            return result;
        }
        return loop(index + 1, data, dictionary, extend_method, succeed);
    };

    const match_segment_equal = (data: any[], value: any[], ok: (i: number) => any): any => {
        for (let i = 0; i < data.length; i++) {
            if (!equal(data[i], value[i])) {
                return createMatchFailure(MatcherName.Segment, 
                                          FailedReason.BindingValueUnmatched, 
                                          data[i], null);
            }
            if (!restriction(data[i])){
                return createMatchFailure(MatcherName.Segment, 
                                          FailedReason.RestrictionUnmatched, 
                                          data[i], null);
            }
        }
        return ok(data.length);
    };

    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(MatcherName.Segment, 
                                      FailedReason.UnexpectedEnd, 
                                      data, null);
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
                                           value: data,
                                           scopeRef: current_env},
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
                                           value: data,
                                           scopeRef: current_env},
                                           dictionary)
                        },
                        succeed);
        } 
        else {
            return match_segment_equal(data, binding, (i) => succeed(dictionary, i));
        }
    };

    return createMatcherInstance(MatcherName.Segment, proc, new Map<string, string | ((value: any) => boolean)>([
        ["var", variable],
        ["restriction", restriction]
    ]))
}

export function match_segment_independently(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_instance {
    const match_segment_all_impl = match_segment(variable, restriction)
    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        return internal_match(match_segment_all_impl, data, dictionary, match_env, (new_dict: MatchDict, nEaten: number) => {
            if (nEaten == data.length) {
                return succeed(new_dict, nEaten);
            }
            else{
                return createMatchFailure(MatcherName.Segment, FailedReason.ToContinue, data, null)
            }
        })
    }
    return createMatcherInstance(MatcherName.Segment, proc, new Map<string, string | ((value: any) => boolean)>([
        ["var", variable],
        ["restriction", restriction]
    ]))
}
export function match_all_other_element(): matcher_instance {
  
    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {  
        const loop = (index: number, data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
            if (index >= data.length) {
                return succeed(dictionary, 0);
            }
            
            if (data === undefined || data === null || data.length === 0) {
                return succeed(dictionary, 0);
            }

            const result = succeed(dictionary, index + 1);

            if (isSucceed(result)) {
                return result;
            }
            else{
                return loop(index + 1, data, dictionary, succeed);
            }
        
        };
        return loop(0, data, dictionary, succeed);
    }
    return createMatcherInstance(MatcherName.AllOtherElement, proc)
}



export function match_compose(matchers: matcher_instance[]) : matcher_instance{
    const proc = (data: any[], dictionary: MatchDict , match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        
        const handleMatchError = (result: any) => {
            // LIMITIONS: WOULD BACKTRACK ALL ERRORS WHEN ERROR OCCURS TODO: IMPROVE IT
            if (isFailed(result)) {
                return createMatchFailure(MatcherName.Compose, FailedReason.UnexpectedInput, data,  result)
            }
            else{
                return result
            }
        }
        
        
        const loop = (data_list: any[], matchers: matcher_instance[], dictionary: MatchDict, eaten: number): any => {

            if (isPair(matchers)){

                const matcher = first(matchers)
                const result = internal_match(matcher, data_list, dictionary, match_env, (new_dict: MatchDict, nEaten: number) => {
                    return loop(data_list.slice(nEaten), rest(matchers), new_dict, eaten + nEaten);
                });
  
                return handleMatchError(result);
            }
            else if (isPair(data_list)){
               return createMatchFailure(MatcherName.Compose, 
                                         FailedReason.UnConsumedInput, 
                                         data_list,  null)  
            } 
            else if (isEmptyArray(data_list)){
                return succeed(dictionary, eaten)
            }
            else{
                return createMatchFailure(MatcherName.Compose, 
                                         FailedReason.UnexpectedEnd, 
                                         data_list, null)
            }

        };
        return loop(data, matchers, dictionary, 0)
    }

    return createMatcherInstance(MatcherName.Compose, proc, new Map<string, any>([
        ["matchers", matchers]
    ]))
}

export function match_array(all_matchers: matcher_instance[]) : matcher_instance {
    const proc = (data: any[], dictionary: MatchDict , match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const compose_matcher = match_compose(all_matchers)

        if (data === undefined || data === null) {
            return createMatchFailure(MatcherName.Array, FailedReason.UnexpectedEnd, data, null)
        }
        else if  (isEmptyArray(data)) {
            return succeed(dictionary, 0)
        }
        else{
            const result = internal_match(compose_matcher, first(data), dictionary, match_env, (dict: MatchDict, nEaten: number) => {return dict})
       
            if (isSucceed(result)){
                // @ts-ignore
                return succeed(result,1)
            }
            else{
                return createMatchFailure(MatcherName.Array, FailedReason.UnexpectedEnd, data, result)
            }
        }
    };
    return createMatcherInstance(MatcherName.Array, proc, new Map<string, any>([
        ["matchers", all_matchers]
    ]))
}


export function match_choose(matchers: matcher_instance[]): matcher_instance {
    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        var failures = []
        for (const matcher of matchers) {
            const result = internal_match(matcher, data, dictionary, match_env, succeed)
          
            if (isSucceed(result)) {
                return result
            }
            else{
                failures.push(result)
            }
        }

        return createMatchFailure(MatcherName.Choose, 
                                  FailedReason.UnexpectedEnd, 
                                  [data, ["try pair with matchers:", matchers.map((m) => internal_get_name(m))], failures], null)
    }
    return createMatcherInstance(MatcherName.Choose, proc, new Map<string, any>([
        ["matchers", matchers]
    ]))
}

// match_begin is a special matcher that match with several submatcher, however the return value is much nuanced
// if some of the matcher failed, it returns matchPartialSuccess with information about success matcher and failed matcher
export function match_begin(matchers: matcher_instance[]): matcher_instance {
    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const loop = (remain_matchers: matcher_instance[], succeedResult: any[]): any => {
            if (isEmptyArray(remain_matchers)) {
                return createMatchFailure(MatcherName.Begin, FailedReason.UnexpectedEmptyInput, data, null);
            }

            const matcher = first(remain_matchers);
            const result = internal_match(matcher, data, dictionary, match_env, succeed);

            if (isSucceed(result)) {
                if (remain_matchers.length === 1) {
                    return result;
                }
                else{
                    return loop(rest(remain_matchers), [...succeedResult, result]);
                }
            } else {
                if (succeedResult.length === 0) {
                    return createMatchFailure(MatcherName.Begin, FailedReason.NonOfTheMatcherSucceed, [data, ["matchers:", matchers]], result);
                }
                else{
                    return createMatchPartialSuccess(matchers.slice(0, succeedResult.length), succeedResult.length, succeedResult, result);
                }
            }
        };
        return loop(matchers, []);
    };
    return createMatcherInstance(MatcherName.Begin, proc, new Map<string, any>([
        ["matchers", matchers]
    ]));
}

export function match_reference(reference_symbol: string): matcher_instance{
    return createMatcherInstance(MatcherName.Reference, (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const matcher = get_value({key: reference_symbol,
                                   matchEnv: match_env},
                                   dictionary)
        if (data === undefined || data === null ) {
            return createMatchFailure(MatcherName.Reference, FailedReason.UnexpectedEnd, data, null)
        }
        else if (matcher) {

            const result = internal_match(matcher, data, dictionary, match_env, succeed)
    
            if (isSucceed(result)) {
                return result
            }
            else{
                return createMatchFailure(MatcherName.Reference, FailedReason.UnexpectedEnd, data, result)
            }
        }
        else{
            return createMatchFailure(MatcherName.Reference, FailedReason.ReferenceNotFound, data, null)
        }
    }, new Map<string, any>([
        ["reference_symbol", reference_symbol]
    ]))
}


export function match_letrec(bindings: {key: string, value: matcher_instance}[], body: matcher_instance): matcher_instance {
    return createMatcherInstance(MatcherName.Letrec, (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const new_env_ref: ScopeReference = new_ref()
        const new_env = extend(new_env_ref, match_env)
        
        const extended_dict = bindings.reduce((acc, binding) => {
            return extend({key: binding.key,
                           value: binding.value,
                           scopeRef: new_env_ref},
                           acc)
        }, dictionary)
        
        return internal_match(body, data, extended_dict, new_env, succeed)
    }, new Map<string, any>([
        ["bindings", bindings],
        ["body", body]
    ]))
}

export function match_new_var(names: string[], body: matcher_instance): matcher_instance {
    return createMatcherInstance(MatcherName.NewVar, (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const new_env_ref: ScopeReference = new_ref()
        const new_env = extend(new_env_ref, match_env)
        
        const extended_dict = names.reduce((acc, name) => {
            return extend({key: name,
                           value: will_define,
                           scopeRef: new_env_ref},
                          acc)
        }, dictionary)
        
        return internal_match(body, data, extended_dict, new_env, succeed)
    }, new Map<string, any>([
        ["names", names],
        ["body", body]
    ]))
}

