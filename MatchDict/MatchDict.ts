
import { guard } from "../utility";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import {  inspect } from "bun";
import { DictValue, is_dict_value, construct_dict_value, get_default_value, is_scope_reference } from "./DictValue";
import { get_value, extend } from "./DictInterface";


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

export function get_raw_value(key: string, mdict: MatchDict): DictValue | undefined{
    return mdict.dict.get(key)
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
            throw Error("captured empty when setting up dict value, match_dict:" + inspect(match_dict))
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
            throw Error("try to get default value when it is not bounded, key = " + inspect(key) + " dict = " + inspect(dict))
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
    (kasf: KeyAndScopedRef, mdict: MatchDict) => {
        const item = mdict.dict.get(kasf.key)

        return get_value(kasf.scopeRef, item)
    }
)

// Scope index refers to the position of a value within nested scopes, starting from the outermost scope.
// It is zero-based: 0 represents the outermost scope, and (map.size - 1) represents the innermost scope.
// Example: For scopes [A, B, C], index 0 = A (outermost), 1 = B, 2 = C (innermost)
export type KeyAndScopeIndex = {
    key: string,
    scopeIndex : number
}

export function is_key_and_scoped_index(A: any) : boolean{
    return typeof A === 'object'
         && A !== null 
        && 'key' in A 
        && 'scopeIndex' in A 
}

define_generic_procedure_handler(get_value,
    (A: any, B: any) => {
        return  is_key_and_scoped_index(A) && is_match_dict(B)
    },
    (kasi: KeyAndScopeIndex, mdict: MatchDict) => {
        const item = mdict.dict.get(kasi.key)

        if ((item !== undefined) && (item !== null)){
            if (kasi.scopeIndex < item.referenced_definition.size){
                const entries = Array.from(item.referenced_definition.entries())
                return entries[kasi.scopeIndex][1]
            }
            else{
                throw Error("attempt to get scope index exceeds from the value size, kasi: " + inspect(kasi) + " dict: " + inspect(mdict) )
            }
        }
        else{
            throw Error("attempt to get the scope value from a undefined index, kasi: " + inspect(kasi) + " dict: " + inspect(mdict) )
        }
    }
)
