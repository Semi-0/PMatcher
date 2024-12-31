import { MatchDict, empty_match_dict, get_raw_entity } from "./MatchDict/MatchDict";
import type { matcher_callback } from "./MatchCallback";

import { first, rest, isPair, isEmpty, isArray, get_length, get_element, slice, set_element, construct, map, filter, reduce, second } from "./GenericArray";
import type { ScopeReference } from "./MatchDict/ScopeReference";
import { extend, get_value } from "./MatchDict/DictInterface";
import { default_match_env, get_current_scope, type MatchEnvironment } from "./MatchEnvironment";
import { new_ref } from "./MatchDict/ScopeReference";
import { construct_dict_value } from "./MatchDict/DictValue";
import { is_will_define, will_define } from "./MatchDict/DictValue";
import type { matcher_instance } from "./MatchCallback";
import { createMatchFailure } from "./MatchResult/MatchFailure";
import { createMatcherInstance, internal_match, internal_get_name, internal_get_args } from "./MatchCallback";
import { MatcherName } from "./NameDict";
import { FailedReason } from "./MatchResult/MatchFailure";
import { equal } from "./utility";
import { isFailed, isSucceed } from "./Predicates";
import { createMatchPartialSuccess } from "./MatchResult/PartialSuccess";
import { MatchResult } from "./MatchResult/MatchResult";
import { get_dict, get_eaten } from "./MatchResult/MatchResult";

export function match_constant(pattern_constant: string): matcher_instance {
    const proc =  (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any  => {
        if (data === undefined || data === null || isEmpty(data)) {
            return createMatchFailure(MatcherName.Constant, FailedReason.UnexpectedEnd, data, null);
        }
        if (equal(first(data), pattern_constant)) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(MatcherName.Constant, FailedReason.UnexpectedInput, [first(data), pattern_constant], null);
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
        if (get_length(data) === 0){
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

export function match_element(variable: string, critics: (value: any) => boolean = (value: any) => true): matcher_instance {
    const proc = (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (environment: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null || isEmpty(data)) {
            return createMatchFailure(MatcherName.Element, 
                                      FailedReason.UnexpectedEnd, 
                                      data, null);
        }
        const binding_value = get_value({key: variable, matchEnv: matchEnv}, dictionary)
        const current_scope_ref = get_current_scope(matchEnv)
        const head = first(data)
        if (!critics(head)){
            return createMatchFailure(MatcherName.Element, 
                                      FailedReason.RestrictionUnmatched, 
                                      head, null);
        }
        else if ((binding_value === undefined) || (binding_value === null)){
            const current_env = get_current_scope(matchEnv)
            const extended = extend({key: variable,
                                     value: construct_dict_value(head,
                                                                 current_env)},
                                     dictionary);
            return succeed(extended, 1)
        }
        else if (is_will_define(binding_value, current_scope_ref)) {
                const extended = extend({key: variable, 
                                         value: head,
                                         scopeRef: current_scope_ref},
                                         dictionary);

                return succeed(extended, 1);
            }
        
        
        
        
        else if (equal(binding_value, head)) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(MatcherName.Element,
                                      FailedReason.BindingValueUnmatched, 
                                      head, null);
        }
    };
    return createMatcherInstance(MatcherName.Element, proc, new Map<string, string | ((value: any) => boolean)>([
        ["var", variable],
        ["restriction", critics]
    ]))
}

export function match_segment(variable: string, critics: (value: any) => boolean = (value: any) => true): matcher_instance {
    

    const match_segment_equal = (data: any[], value: any[], ok: (i: number) => any): any => {
        for (let i = 0; i < get_length(data); i++) {
            if (!equal(get_element(data, i), get_element(value, i))) {
                return createMatchFailure(MatcherName.Segment, 
                                          FailedReason.BindingValueUnmatched, 
                                          get_element(data, i), null);
            }
            if (!critics(get_element(data, i))){
                return createMatchFailure(MatcherName.Segment, 
                                          FailedReason.RestrictionUnmatched, 
                                          get_element(data, i), null);
            }
        }
        return ok(get_length(data));
    };

    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {

        const current_env = get_current_scope(match_env)

        const loop = (index: number): any => {
            
            if (index > get_length(data)) {
                return createMatchFailure(MatcherName.Segment, 
                                        FailedReason.IndexOutOfBound, 
                                        [data, ["index", index], ["dict", dictionary]], null);
            }

            if (!critics(get_element(data, index))){
                return createMatchFailure(MatcherName.Segment, 
                                        FailedReason.RestrictionUnmatched, 
                                        get_element(data, index), null);
            }

            const data_to_extend = slice(data, 0, index)
            const result = succeed(extend({key: variable, value: data_to_extend, scopeRef: current_env}, dictionary), index);

            if (isSucceed(result)) {
                return result;
            }
            else{
                return loop(index + 1);
            }
        };

        if (data === undefined || data === null ) {
            return createMatchFailure(MatcherName.Segment, 
                                      FailedReason.UnexpectedEnd, 
                                      data, null);
        }


        const binding = get_value({key: variable, 
                                   matchEnv: match_env},
                                   dictionary);


        if (binding === undefined || binding === null || is_will_define(binding, current_env)) {
            return loop(0);
        } 
   
        else {
            return match_segment_equal(data, binding, (i) => succeed(dictionary, i));
        }
    };

    return createMatcherInstance(MatcherName.Segment, proc, new Map<string, string | ((value: any) => boolean)>([
        ["var", variable],
        ["restriction", critics]
    ]))
}

export function match_segment_independently(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_instance {
    const match_segment_all_impl = match_segment(variable, restriction)
    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        return internal_match(match_segment_all_impl, data, dictionary, match_env, (new_dict: MatchDict, nEaten: number) => {
            if (nEaten == get_length(data)) {
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
            if (index >= get_length(data)) {
                return succeed(dictionary, 0);
            }
            
            if (data === undefined || data === null || isEmpty(data)) {
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
                    return loop(slice(data_list, nEaten), rest(matchers), new_dict, eaten + nEaten);
                });
  
                return handleMatchError(result);
            }
            else if (isPair(data_list)){
               return createMatchFailure(MatcherName.Compose, 
                                         FailedReason.UnConsumedInput, 
                                         [data_list, get_length(data_list)],  null)  
            } 
            else if (isEmpty(data_list)){
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
        else if  (isEmpty(data)) {
            return succeed(dictionary, 0)
        }
        else{
            const result = internal_match(compose_matcher, first(data), dictionary, match_env, (dict: MatchDict, nEaten: number) => {return new MatchResult(dict, nEaten)})
       
            if (isSucceed(result)){
                const dict = get_dict(result)
         
                return succeed(dict, 1)
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
                                  //@ts-ignore
                                  [data, ["try pair with matchers:", map(matchers, (m) => internal_get_name(m))], failures], null)
    }
    return createMatcherInstance(MatcherName.Choose, proc, new Map<string, any>([
        ["matchers", matchers]
    ]))
}

export function match_begin(matchers: matcher_instance[]): matcher_instance {
    const proc = (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const loop = (remain_matchers: matcher_instance[], succeedResult: any[]): any => {
            if (isEmpty(remain_matchers)) {
                return createMatchFailure(MatcherName.Begin, FailedReason.UnexpectedEmptyInput, data, null);
            }

            const matcher = first(remain_matchers);
            const result = internal_match(matcher, data, dictionary, match_env, succeed);

            if (isSucceed(result)) {
                if (get_length(remain_matchers) === 1) {
                    return result;
                }
                else{
                    return loop(rest(remain_matchers), construct(result, ...succeedResult));
                }
            } else {
                if (get_length(succeedResult) === 0) {
                    return createMatchFailure(MatcherName.Begin, FailedReason.NonOfTheMatcherSucceed, [data, ["matchers:", matchers]], result);
                }
                else{
                    return createMatchPartialSuccess(slice(matchers, 0, get_length(succeedResult)), get_length(succeedResult), succeedResult, result);
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
        //@ts-ignore
        const extended_dict = reduce(bindings, (acc, binding) => {
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
     
        //@ts-ignore
        const extended_dict = reduce(names, (acc, name) => {
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



export function match_extract_matcher(matcher_name: string, matcher_expr: matcher_instance): matcher_instance {
    return createMatcherInstance(MatcherName.ExtractMatcher, (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        
        const loop = (instance: matcher_instance): any => {
            const name = internal_get_name(instance)
            if (name === MatcherName.Array) {
                const result: any[] = internal_get_args(instance, "matchers")
                
                if (isArray(result)) {
                    //@ts-ignore
                    return match_array(map(result, (matcher) => loop(matcher)))
                }
                else {
                    return createMatchFailure(MatcherName.ExtractMatcher, FailedReason.UnexpectedEnd, result, null)
                }
            }
            else if (name === matcher_name) {
                return instance
            }
            else {
                return match_wildcard()
            }
        }
        
        return internal_match(loop(matcher_expr), data, dictionary, match_env, succeed)
    
    }, new Map<string, any>([
        ["matcher_name", matcher_name],
        ["matcher_expr", matcher_expr]
    ]))
}


export function match_map(matcher: matcher_instance, func: matcher_instance): matcher_instance {
    return createMatcherInstance(MatcherName.Map, (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const result = internal_match(matcher, data, dictionary, match_env, (dict: MatchDict, nEaten: number) => {
            const result = succeed(dict, nEaten)
            if (isSucceed(result)){
                const fdict: MatchDict = get_dict(result)
                const fnEaten: number = get_eaten(result)
                return internal_match(func, slice(data, 0, fnEaten), fdict, match_env, succeed)
            }
            else{
                return result
            }
        })
        return result
    })
}

export function match_transform(transformer: (data: any) => any,  matcher: matcher_instance): matcher_instance {
    return createMatcherInstance(MatcherName.Transform, (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null) {
            return createMatchFailure(MatcherName.Transform, FailedReason.UnexpectedEnd, data, null)
        }
        else if (isArray(data)){
            if (isEmpty(data)){
                return createMatchFailure(MatcherName.Transform, FailedReason.UnexpectedEmptyInput, data, null)
            }
            else{
                const transformed_data = map(data, (d) => transformer(d))
                return internal_match(matcher, transformed_data, dictionary, match_env, succeed)
            }
        }
        else{
            return createMatchFailure(MatcherName.Transform, FailedReason.UnexpectedInput, data, null)
        }
        

    })
}

export function match_with(variable: string, matcher: matcher_instance): matcher_instance {
    return createMatcherInstance(MatcherName.With, (data: any[], dictionary: MatchDict, match_env: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const v = get_value({key: variable, matchEnv: match_env}, dictionary)
        if (v === undefined || v === null) {
            return createMatchFailure(MatcherName.With, FailedReason.UnexpectedEnd, data, null)
        }
        return internal_match(matcher, [v], dictionary, match_env, succeed)
    })
}