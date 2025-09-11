import type { ScopeReference } from "./MatchDict/ScopeReference"
import { define_generic_procedure_handler } from "generic-procedure/GenericProcedure"
import { copy } from "./utility"
import { extend } from "./MatchDict/DictInterface"
import { is_scope_reference } from "./MatchDict/ScopeReference"
export type MatchEnvironment = ScopeReference[]
// MatchEnvironment is a record of the address of scope reference
import { first } from "./GenericArray"
export function is_match_env(A: any): boolean{
    return Array.isArray(A)
        && A.every((item) => {
            return typeof item === "number"
        })
}

export function default_match_env(){
    return [0]
}

define_generic_procedure_handler(copy,
    (A: any) =>{
        return is_match_env(A)
    }, (env: MatchEnvironment) => {
        var copy: MatchEnvironment = []
        env.forEach(item => copy.push(item))
        return copy
    }
)

define_generic_procedure_handler(extend, 
    (A: any, B: any) => {
        return is_scope_reference(A) && is_match_env(B)
    },
    (ref: ScopeReference, env: MatchEnvironment) => {
        var c: MatchEnvironment = copy(env)
        c.unshift(ref)
        return c
    }
)

export function get_current_scope(env: MatchEnvironment){
    return first(env)
}
