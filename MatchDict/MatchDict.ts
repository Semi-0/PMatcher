
import { guard } from "../utility";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import {  inspect } from "bun";
import { DictValue, is_dict_value, construct_dict_value, get_most_bottom_value, extend_new_value_in_scope, get_value_sequence } from "./DictValue";
import { get_value, extend } from "./DictInterface";

import { default_ref, is_scope_reference, type ScopeReference } from "./ScopeReference";
import type { MatchEnvironment } from "../MatchEnvironment";
import { is_match_env } from "../MatchEnvironment";
import { default_match_env } from "../MatchEnvironment";
import { copy } from "../utility"

export class MatchDict {
    dict: Map<string, DictValue>

    constructor(){
        this.dict = new Map()
    }
}

define_generic_procedure_handler(copy, ( A:any ) => { return is_match_dict(A)}, 
    (dict: MatchDict) => {
        const copy = new MatchDict()
        copy.dict = new Map(dict.dict)
        return copy
    }
)


export function empty_match_dict(): MatchDict{
    return new MatchDict()
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

export function get_raw_entity(key: string, mdict: MatchDict): DictValue | undefined {
    return mdict.dict.get(key)

}

export function get_dict_value_sequence(key: string, mdict: MatchDict): any[] | undefined{
   const e = get_raw_entity(key, mdict) 
   if (e !== undefined){
        return get_value_sequence(e)
   }
   else{
        return undefined
   }
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
        const c = copy(match_dict)
        // empty dict value is also included
        if (is_dict_value(A.value)){
            c.dict.set(A.key, A.value)
            return c
        }
        else if ((A !== null) && (A !== undefined)){
            const new_value = construct_dict_value(A.value, default_ref())
            c.dict.set(A.key, new_value)
            return c
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
            return get_most_bottom_value(v)
        }
        else{
            throw Error("try to get default value when it is not bounded, key = " + inspect(key) + " dict = " + inspect(dict))
        }
    }
)


export type KeyAndMatchEnv ={
    key: string,
    matchEnv: MatchEnvironment
}

export function is_key_and_match_env(A: any){
    return typeof A === 'object'
        && A !== null 
        && 'key' in A 
        && 'matchEnv' in A 
        && is_match_env(A.matchEnv) 
}

define_generic_procedure_handler(get_value, 
    (A: any, B: any) => {
        return is_key_and_match_env(A) && is_match_dict(B)
    }, (kae: KeyAndMatchEnv, mdict: MatchDict) => {
        const item = mdict.dict.get(kae.key)

        if ((item != undefined) && (item != null)){
            return get_value(kae.matchEnv, item)
        }
        else {
            return undefined
        }
    }
    
)


export type bindingAndScopeRef = {
    key: string,
    value: any,
    scopeRef: ScopeReference
}

export function is_binding_and_scope_ref(A: any){
    return typeof A === 'object'
        && A !== null 
        && 'key' in A 
        && 'value' in A
        && 'scopeRef' in A 
        && is_scope_reference(A.scopeRef) 
}

define_generic_procedure_handler(extend,
    (A: any, B: any) => {
        return is_binding_and_scope_ref(A) && is_match_dict(B)
    },
    (bas: bindingAndScopeRef, mdict: MatchDict) => {
        const existed = get_raw_entity(bas.key, mdict)

        if (existed !== undefined){
            const new_item = {
                key: bas.key,
                value: extend_new_value_in_scope(bas.value,
                                                 bas.scopeRef,
                                                 existed)
            }

            return extend(new_item, mdict)
        }
        else{
            const new_item = {
                key: bas.key,
                value: construct_dict_value(bas.value,
                                            bas.scopeRef)
            }
            
            return extend(new_item, mdict)
        }
    }
)


export type KeyAndScopeRef = {
    key: string,
    scopeRef: ScopeReference 
}

export function is_key_and_scope_ref(A: any){
    return typeof A === 'object'
        && A !== null 
        && 'key' in A 
        && 'scopeRef' in A 
        && is_scope_reference(A.scopeRef)
}

define_generic_procedure_handler(get_value,
    (A: any, B: any) => {
        return is_key_and_scope_ref(A) && is_match_dict(B)
    }, 
    (kasf: KeyAndScopeRef, mdict: MatchDict) => {
        const item = mdict.dict.get(kasf.key)
        
        if ((item != undefined) && (item != null)){
            return get_value(kasf.scopeRef, item)
        }
        else{
            return undefined
        }
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
