import type { ScopeReference } from "./MatchDict/ScopeReference"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { extend } from "./MatchDict/DictInterface"
import { is_scope_reference } from "./MatchDict/ScopeReference"
import { copy } from "./MatchDict/DictValue"
export type MatchEnvironment = ScopeReference[]
// MatchEnvironment is a record of the address of scope reference
import { first } from "./GenericArray"
import { match_args, register_predicate } from "generic-handler/Predicates"
export const is_match_env = register_predicate("is_match_env", (A: any): boolean => {
    return Array.isArray(A)
})

export function default_match_env(){
    return [0]
}

define_generic_procedure_handler(copy,
    match_args(is_match_env),
    (env: MatchEnvironment) => {
        var copy: MatchEnvironment = []
        env.forEach(item => copy.push(item))
        return copy
    }
)

define_generic_procedure_handler(extend, 
    match_args(is_scope_reference, is_match_env),
    (ref: ScopeReference, env: MatchEnvironment) => {
        var c: MatchEnvironment = copy(env)
        c.unshift(ref)
        return c
    }
)

export function get_current_scope(env: MatchEnvironment){
    return first(env)
}
