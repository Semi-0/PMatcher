import { guard } from "../utility";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";

import { get_value, extend } from "./DictInterface";
import {  default_ref, is_scope_reference, new_ref } from "./ScopeReference";
import type { ScopeReference } from "./ScopeReference";

import {v4 as uuidv4} from 'uuid'
import { all_match, match_args, register_predicate } from "generic-handler/Predicates";


export const copy = construct_simple_generic_procedure("copy", 1,
    (A: any) => {
        throw Error("unknown object to copy, A: " + A)

    }
)

export class DictValue{
    referenced_definition: Map<ScopeReference, any>

    constructor(){
        this.referenced_definition = new Map()
    }
}

////WARNINF!!!!
export const will_define =  uuidv4()

export const is_dict_value = register_predicate("is_dict_value", (item: any): boolean => {
    return item instanceof DictValue
})

define_generic_procedure_handler(copy, match_args(is_dict_value), (dict: DictValue) => {
    const copy = new DictValue()
    copy.referenced_definition = new Map(dict.referenced_definition)
    return copy
})

export function get_value_sequence(value: DictValue): any[] {
    const result: any[] = [];
    for (const item of value.referenced_definition.values()) {
        if (item !== will_define) {
            result.push(item);
        }
    }
    return result;
}



export function empty_dict_value(): DictValue{
    return new DictValue
}

export function has_default_value(value: DictValue): boolean{
    return has_value(value) && value.referenced_definition.has(default_ref())
}

export function has_value(value: DictValue): boolean{
    return value.referenced_definition.size >= 1
}

export function is_empty_dict_value(value: DictValue): boolean{
    return value.referenced_definition.size === 0
}

export function is_will_define(value: any, scope_ref: ScopeReference): boolean{
    return value === will_define
}

export function get_most_bottom_value(value: DictValue): any{
    if (has_value(value)){
        return value.referenced_definition.values().next().value
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

export function extend_will_define_in_scope(ref: ScopeReference, dictValue: DictValue): DictValue{
    const c = copy(dictValue)
    c.referenced_definition.set(ref, will_define)
    return c
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
    match_args(is_scope_reference, is_dict_value),
    (scope_ref: ScopeReference, value: DictValue) => {
        // interface for precise get_value
        guard(() => {return has_scope_reference(scope_ref, value)},() => {
            throw Error("scope reference not existed in scope item, scope_ref: " + scope_ref + " dict: " + value)
        })

        return value.referenced_definition.get(scope_ref)
    }
)


define_generic_procedure_handler(extend,
    // extending default value
    all_match(is_dict_value),
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

export const is_nested_value = register_predicate("is_nested_value", (A: any): A is NestedValue => {
    return typeof A === 'object' 
        && A !== null 
        && 'value' in A 
        && 'scopeRef' in A 
        && is_scope_reference(A.scopeRef)
})


define_generic_procedure_handler(extend, 
    match_args(is_nested_value, is_dict_value),
    (nested_value: NestedValue, item: DictValue) => {
        const c = copy(item)
        c.referenced_definition.set(nested_value.scopeRef, nested_value.value)
        return c
    }
)

