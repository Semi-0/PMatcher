import { guard } from "../utility";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import {  inspect } from "bun";
import { get_value, extend } from "./DictInterface";
import {  default_ref, is_scope_reference, new_ref } from "./ScopeReference";
import type { ScopeReference } from "./ScopeReference";
import { copy } from "../utility"
import { is_match_env, type MatchEnvironment } from "../MatchEnvironment";


export class DictValue{
    referenced_definition: Map<ScopeReference, any>

    constructor(){
        this.referenced_definition = new Map()
    }
}

define_generic_procedure_handler(copy, (A: any) => {
    return is_dict_value(A)
}, (dict: DictValue) => {
    const copy = new DictValue()
    copy.referenced_definition = new Map(dict.referenced_definition)
    return copy
})

export function is_dict_value(item: any): boolean{
    return item instanceof DictValue
}

export function empty_dict_value(): DictValue{
    return new DictValue
}

export function has_default_value(value: DictValue): boolean{
    return value.referenced_definition.size >= 1 && value.referenced_definition.has(default_ref())
}

export function is_empty_dict_value(value: DictValue): boolean{
    return value.referenced_definition.size === 0
}

export function get_default_value(value: DictValue): any{
    if (has_default_value(value)){
        return value.referenced_definition.get(default_ref())
    }
    else{
        throw Error("attempt to get default value from empty, v:" + value)
    }
}

export function construct_dict_value(value: any, scope_ref: ScopeReference): DictValue {
    const dict_item = empty_dict_value()
    dict_item.referenced_definition.set(scope_ref, value)
    return dict_item
}

export function extend_new_value_in_scope(value: any, ref: ScopeReference , dictValue: DictValue): DictValue{
    const c = copy(dictValue)
    c.referenced_definition.set(ref, value)
    return c
}

export function has_multi_scope_definition(item: DictValue): boolean {
    return item.referenced_definition.size > 1;
}

export function has_scope_reference(ref: ScopeReference, item: DictValue): boolean{
    return item.referenced_definition.has(ref)
}

define_generic_procedure_handler(get_value,
    (A: any, B: any) => {
        return is_scope_reference(A) && is_dict_value(B)
    },
    (scope_ref: ScopeReference, value: DictValue) => {
        // interface for precise get_value
        guard(() => {return has_scope_reference(scope_ref, value)},() => {
            throw Error("scope reference not existed in scope item, scope_ref: " + scope_ref + " dict: " + value)
        })

        return value.referenced_definition.get(scope_ref)
    }
)

define_generic_procedure_handler(get_value,
    (A: any, B: any) => {
        return is_match_env(A) && is_dict_value(B)
    },
     (env: MatchEnvironment, value: DictValue) => {

        guard(() => {return env.length !== 0}, () => {
            throw Error("error try to get value from a empty env, env: " + inspect(env))
        })

        for (var index = 0; index < env.length; index++){
            const ref: ScopeReference = env[index]
            
            guard(() => {return value.referenced_definition.size !== 0}, () =>{
                throw Error("error try to get value from a empty dict, dict: " + inspect(value))
            })
            const result = value.referenced_definition.get(ref)

             if ((result != undefined) && (result != null)){
                return result
            }
            else{
                continue
            }
        }
        return undefined
    }
)


define_generic_procedure_handler(extend,
    // extending default value
    (A: any, B: any) => {
        return is_dict_value(B)
    },
    (default_value: any, item: DictValue) => {
        guard(() => {return has_default_value(item)}, () => {
            throw Error("error! dict item already has a default value")
        })
            
        return extend({value: default_value, scopeRef: 0}, item)
    }
)

/// expected: Tuple (value: any, scopeRef: scopleReference)
export type NestedValue = {
    value: any,
    scopeRef: ScopeReference
}

function is_nested_value(A: any): A is NestedValue {
    return typeof A === 'object' 
        && A !== null 
        && 'value' in A 
        && 'scopeRef' in A 
        && is_scope_reference(A.scopeRef);
}


define_generic_procedure_handler(extend, 
    (A: any, B: any) => {
        return is_nested_value(A) && is_dict_value(B)
    },
    (nested_value: NestedValue, item: DictValue) => {
        const c = copy(item)
        c.referenced_definition.set(nested_value.scopeRef, nested_value.value)
        return c
    }
)

