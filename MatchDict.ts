import { guard } from "./utility";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { inspect } from "bun";

export type ScopeReference = Number;

export function is_scope_reference(ref: any): boolean{
    return typeof ref === "number"
}

export const get_value = construct_simple_generic_procedure("get_value", 2, 
    (referece: any, source: any) => {
        throw Error("args not matched for get_value, ref: "  + inspect(referece) + " source: " + inspect(source))
    }
)

export const extend = construct_simple_generic_procedure("extend", 2,
    (item: any, to: any) => {
        throw Error("args not matched for extend, item: " + inspect(item)+ " to: " + inspect(to))
    }
)


export class DictValue{
    referenced_definition: Map<ScopeReference, any>

    constructor(){
        this.referenced_definition = new Map()
    }
}

function is_dict_value(item: any): boolean{
    return item instanceof DictValue
}

export function empty_dict_value(): DictValue{
    return new DictValue
}

export function has_default_value(value: DictValue): boolean{
    return value.referenced_definition.size >= 1 && value.referenced_definition.has(0)
}

export function is_empty_dict_value(value: DictValue): boolean{
    return value.referenced_definition.size === 0
}

export function get_default_value(value: DictValue): any{
    if (has_default_value(value)){
        return value.referenced_definition.get(0)
    }
    else{
        throw Error("attempt to get default value from empty, v:" + value)
    }
}

export function construct_dict_value(num: ScopeReference, value: any): DictValue {
    const dict_item = empty_dict_value()
    dict_item.referenced_definition.set(num, value)
    return dict_item
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
        guard(() => {return has_scope_reference(scope_ref, value)},() => {
            throw Error("scope reference not existed in scope item, scope_ref: " + scope_ref + " dict: " + value)
        })

        return value.referenced_definition.get(scope_ref)
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
        item.referenced_definition.set(nested_value.scopeRef, nested_value.value)
        return item
    }
)



export class MatchDict {
    dict: Map<string, DictValue>

    constructor(){
        this.dict = new Map()
    }
}

export function is_match_key(a: any): boolean{
    return typeof a === "string"
}

export function is_match_dict(a: any): boolean{
    return a instanceof MatchDict
}

export function has_key(key: string, match_dict: MatchDict): boolean{
    return match_dict.dict.has(key);
}


export type DictItem = {
    key: string,
    value: DictValue | any
}


export function format_match_dict_item(A: any) : boolean{
    return typeof A === "object"
        && A !== null
        && 'key' in A 
        && 'value' in A  
}

export function is_dict_item(A: any) : boolean{
    return format_match_dict_item(A) 
}



define_generic_procedure_handler(extend,
    (A: any, B: any) => {
        return  is_dict_item(A) && is_match_dict(B)
    },
    (A: any, match_dict: MatchDict) => {
        // empty dict value is also included
        if (is_dict_value(A.value)){
            match_dict.dict.set(A.key, A.value)
            return match_dict
        }
        else if ((A !== null) && (A !== undefined)){
            const new_value = construct_dict_value(0, A.value)
            match_dict.dict.set(A.key, new_value)
            return match_dict
        }
        else{
            throw Error("captured empty when setting up dict value, match_dict:" + match_dict)
        }
    }
)


export function is_dict_key(A: any): boolean{
    return typeof A === "string"
}

// normal getting value: instead of getting the referenced value, get the default value
define_generic_procedure_handler(get_value,
    (A: any, B: any) => {
        return is_dict_key(A) && is_match_dict(B)
    },
    (key: string, dict: MatchDict) => {
        const v = dict.dict.get(key)

        if ((v !== undefined) && (v !== null)){
            return get_default_value(v)
        }
        else{
            throw Error("try to get default value when it is not bounded, key = " + key + " dict = " + dict)
        }
    }
)


export type KeyAndScopedRef = {
    key: string,
    scopeRef: number
}

export function is_key_and_scoped_ref(A: any){
    return typeof A === 'object'
        && A !== null 
        && 'key' in A 
        && 'scopeRef' in A 
        && is_scope_reference(A.scopeRef)
}

define_generic_procedure_handler(get_value,
    (A: any, B: any) => {
        return is_key_and_scoped_ref(A) && is_match_dict(B)
    }, 
    (kas: KeyAndScopedRef, mdict: MatchDict) => {
        const item = mdict.dict.get(kas.key)

        return get_value(kas.scopeRef, item)
    }
)


// TODO: ADD UNIT TEST