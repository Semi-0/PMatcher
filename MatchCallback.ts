import { get_value } from "./MatchDict/DictInterface";
import { DictValue, construct_dict_value, extend_new_value_in_scope, is_empty_dict_value, is_will_define } from "./MatchDict/DictValue";
import { MatchDict, get_raw_entity } from "./MatchDict/MatchDict";
import type { ScopeReference } from "./MatchDict/ScopeReference";
import { createMatchFailure } from "./MatchResult/MatchFailure";
import { FailedReason } from "./MatchResult/MatchFailure";
import { extend } from "./MatchDict/DictInterface"
import { get_current_scope, type MatchEnvironment } from "./MatchEnvironment";
import { isElementAccessExpression } from "typescript";
import { equal } from "./utility";
import { isSucceed, isFailed } from "./Predicates";
import { MatcherName } from "./NameDict"
import { register_predicate } from "generic-handler/Predicates";
export type matcher_callback =  (data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any) => any
// needs more precise error handler
// TODO: Support Any Type Done  
// TODO: Composable Matcher Done
// TODO: Match in nested list
// TODO: Match with compiling pattern

export type matcher_instance = {
    name: MatcherName,
    args: Map<string, any> | null, 
    procedure: matcher_callback
    index: string | null // for tracing matchindex
} 

export const is_match_instance = register_predicate("is_match_instance", (matcher: any) : matcher is matcher_instance => {
    return matcher && typeof matcher === "object" && typeof matcher.name === "string" && typeof matcher.procedure === "function"
})

export function createMatcherInstance(name: MatcherName, procedure: matcher_callback, args : null | Map<string, any> = null, index: string | null = null): matcher_instance {
    return {name, args, procedure, index}
}

export function internal_get_vars(matcher_instance: matcher_instance): Map<string, any> | null {
    return internal_get_args(matcher_instance, "vars");
}

export function internal_get_args(matcher_instance: matcher_instance, arg_name: string): any | null {
    return matcher_instance.args?.get(arg_name);
}

export function internal_match(matcher_instance: matcher_instance, data: any[], dictionary: MatchDict, matchEnv: MatchEnvironment, succeed: (dictionary: MatchDict, nEaten: number) => any): any {
    return matcher_instance.procedure(data, dictionary, matchEnv, succeed);
}

export function internal_get_name(matcher_instance: matcher_instance): MatcherName {
    return matcher_instance.name;
}


