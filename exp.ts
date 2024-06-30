
import {v4 as uuidv4} from 'uuid';


import {isPair, first, rest, isEmptyArray} from "./utility"
import { isArray } from './utility';
import { is_Letrec, is_new_var, is_select , first_equal_with, is_match_reference, P} from './MatchBuilder';
import {inspect} from 'util'

type DictRefs = any[]

function construct_dict_refs(): DictRefs {
    return ["address", []]
}


const to_be_defined = "$_$"

function copyArray(array: any[]): any[] {
   const new_array = []
   for (const item of array) {
    if (isArray(item)){
        new_array.push(copyArray(item))
    }
    else{
        new_array.push(item)
    }
   }
   return new_array
}

function construct_pattern_environment(dict_refs: DictRefs, pattern_environment: MatchEnvironment): DictRefs {
    const ref = uuidv4()
    console.log("uuid_generated", ref)
    console.log("current_refs", get_refs(dict_refs))

    set_entity_in_pattern_environment(ref, construct_simple_pattern_environment(), pattern_environment)
    // const current_env = get_current_environment(get_refs(dict_refs), pattern_environment)
    // set_entity_in_pattern_environment(ref, construct_simple_pattern_environment(), current_env)
    console.log("construct_pattern_environment", ref, pattern_environment)
    console.log("new_ref_address")
    return extend_dict_refs(dict_refs, ref)
}

function get_refs(dict_ref: DictRefs): string[] {
    return dict_ref[1]
}

function is_dict_refs(ref: DictRefs): boolean {
    return ref[0] == "address"
}

function refs_length(dict_ref: DictRefs): number {
    return dict_ref[1].length
}


function extend_dict_refs(dict_ref: DictRefs, ref: string): DictRefs {
    const copy = copyArray(dict_ref)
    copy[1].unshift(ref)
    return copy
}

function lookup(key: string, dict_refs: DictRefs, pattern_environment: MatchEnvironment): any {
    console.log("catch lookup")
    console.log("lookup", key, dict_refs, pattern_environment)
    if (is_dict_refs(dict_refs)) {
        for (const ref of get_refs(dict_refs)){
            const env = get_current_environment(ref, pattern_environment)
            const value = env.get(key)
            if (value) {
                console.log("lookup success", key, value)
                return value
            }
        }
    }
    else{
        return undefined
    }
}

function set_new_entity(key: string, value: any, dict_refs: DictRefs, pattern_environment: MatchEnvironment): void {
    if (is_dict_refs(dict_refs) && refs_length(dict_refs) > 0) {
       const current_env = get_current_environment(get_refs(dict_refs)[0], pattern_environment)
       set_entity_in_pattern_environment(key, value, current_env)
    }
    else{
        throw new Error("Not a dict ref, " + key + " -> " + dict_refs)
    }
}

function set_new_keys(keys: string[],  dict_refs: DictRefs, pattern_environment: MatchEnvironment): void {
    for (const key of keys) {
        set_new_entity(key, to_be_defined, dict_refs, pattern_environment)
    }
}

type MatchEnvironment = Map<string, any>

function construct_simple_pattern_environment(): MatchEnvironment {
    return new Map<string, any>()
}

function get_current_environment(ref: string, pattern_environment: MatchEnvironment): MatchEnvironment {
        const env = pattern_environment.get(ref)
        return env
}


function set_entity_in_pattern_environment(key: string, value: any, pattern_environment: MatchEnvironment): void {
    pattern_environment.set(key, value)
}

function is_pattern_environment(pattern_environment: MatchEnvironment): boolean {
    return pattern_environment instanceof Map
}

type matcher_callback = (data: any[], dict_refs: DictRefs, succeed: (dictionary: MatchEnvironment, nEaten: number) => any, pattern_env: MatchEnvironment) => any

function match_constant(pattern_constant: string): matcher_callback {
    return (data: any[], dict_refs: DictRefs, succeed: (env: MatchEnvironment, nEaten: number) => any, match_env: MatchEnvironment): any  => {
        if (data === undefined || data === null || data.length === 0) {
            console.log("unexpected undefined")
            return false
        }
        if (data[0] === pattern_constant) {
            return succeed(match_env, 1);
        } else {
            console.log("unexpected constant", pattern_constant, data[0])
            return false
        }
    };
}

function hasRestriction(variable: any[]): boolean {
    return variable.length > 2
}

function getRestriction(variable: any[]) : (arg: string) => boolean{
    return variable[1]
}

function getVariableName(variable: any[]) : string{
    const n = first(variable)
    if (typeof n === "string"){
        return n
    }
    else{
        throw new Error("Variable name is not a string, " + n)
    }
}

function isNull(v: any): boolean{
    return v == undefined || v == null
}

function match_element(variable: any[]): matcher_callback {
    return (data: any[], dict_refs: DictRefs, succeed: (env: MatchEnvironment, nEaten: number) => any, match_env: MatchEnvironment): any  => {
        if (isNull(data) || data.length === 0) {
            console.log("unexpected null")
            return false
        }
        console.log("try to match element", variable, data)
        const v = lookup(variable[0], dict_refs, match_env) 
        console.log("lookup result", v, "from_refs", dict_refs)
        if ((hasRestriction(variable)))  {
            console.log("unexpected has restruction")
            return false
        }
        else if (isNull(v) || v === to_be_defined){
            console.log("find undefined var:", variable, "in:", dict_refs, "set to:", data[0])
            set_new_entity(getVariableName(variable), data[0], dict_refs, match_env)
            return succeed(match_env, 1)
        }
        else if (v === data[0]){
            console.log("match element", variable, data[0])
            return succeed(match_env, 1)
        }
        else{
            console.log("unexpected element", v, data[0])
            return false
        }
    }
}

function match_choose(matchers: matcher_callback[]): matcher_callback {
    return (data: any[], dict_refs: DictRefs, succeed: (env: MatchEnvironment, nEaten: number) => any, match_env: MatchEnvironment): any  => {
        for (const matcher of matchers) {
            console.log("data in choose", data)
            const result = matcher(data, dict_refs, succeed, match_env)
            console.log("matcher result", result)
            if (result !== false) {
                console.log("choose success", result)
                return result
            }
        }
        console.log("unexpected choose, no choose matched", matchers)
        return false
    }
}

function match_letrec(bindings : {key: string, value: matcher_callback}[], body: matcher_callback): matcher_callback {
    return (data: any[], dict_refs: DictRefs, succeed: (env: MatchEnvironment, nEaten: number) => any, match_env: MatchEnvironment): any  => {
        const new_dict_refs = construct_pattern_environment(dict_refs, match_env)
        for (const binding of bindings) {
             set_new_entity(binding.key, binding.value, new_dict_refs, match_env)
        }
        return body(data, new_dict_refs, succeed, match_env)
    }
}

function match_new_var(variable: any[], body: matcher_callback): matcher_callback {
    return (data: any[], dict_refs: DictRefs, succeed: (env: MatchEnvironment, nEaten: number) => any, match_env: MatchEnvironment): any  => {
        const new_dict_refs = construct_pattern_environment(dict_refs, match_env)
        set_new_keys(variable, new_dict_refs, match_env)
        console.log("new_dict_ref set", new_dict_refs)
        return body(data, new_dict_refs, succeed, match_env)
    }
}


function match_ref(reference_symbol: string): matcher_callback{
    return (data: any[], dict_refs: DictRefs, succeed: (env: MatchEnvironment, nEaten: number) => any, match_env: MatchEnvironment): any  => {
        console.log("try look up in ref", reference_symbol, dict_refs, match_env)
        const m = lookup(reference_symbol, dict_refs, match_env)
        if (isNull(data) || typeof data == "string"){
            console.log(data)
            console.log("unexpected null or string", reference_symbol, data)
            return false 
        }
        else if (m){
            console.log("start ref")
            const result = m(data, dict_refs, succeed, match_env)
            if (result !== false) {
                console.log("ref_dict")
                console.log(dict_refs)
                console.log("result")
                console.log(result)
                return result
            }
            else{
                console.log("referenced matcher failed ", reference_symbol, inspect(m.toString()))
                return false
            }
        }
        else{
            console.log("unexpected ref", reference_symbol, data)
            return false
        }
    }
}

function match_array(all_matchers: any[]): matcher_callback {
    return (data: any[], dict_refs: DictRefs, succeed: (env: MatchEnvironment, nEaten: number) => any, match_env: MatchEnvironment): any  => {
        const loop = (data_list: any[], matchers: matcher_callback[], dictionary: MatchEnvironment): any => {
            if (isPair(matchers)){
                const matcher = first(matchers)
                const result = matcher(data_list, dict_refs, (new_dict: MatchEnvironment, nEaten: number) => {
                    console.log("go to next array matcher in", dict_refs, "\n")

                    return loop(data_list.slice(nEaten), rest(matchers), new_dict);
                }, match_env);
                // console.log("success matcher:" + matcher.toString())
                return result;
            }
             else if (isPair(data_list)){
                console.log("unconsumed", data_list)
               return false  
            } 
            else if (isEmptyArray(data_list)){
                console.log("data_list", data_list)
                console.log("success empty")
                return succeed(dictionary, 1)
            }
            else{
                console.log("unexpected data", data_list)
                return false
            }

    };

        if (data === undefined || data === null) {
            console.log("unexpected null data")
            return false
        }
        else if  (isEmptyArray(data)) {
            return succeed(match_env, 0)
        }
        else{
            console.log("loop", first(data), all_matchers, match_env)
            return loop(first(data), all_matchers, match_env)
        }
    }
}

function is_match_element(pattern: any[]): boolean {
    const without_restriction = pattern.length === 1
    const has_restruction = pattern.length === 2
    const has_label = first_equal_with(pattern, P.element)

    return has_label && (without_restriction || has_restruction)
}

function build(matchers: any[]): matcher_callback{
    if (is_match_element(matchers)) {
        return match_element(matchers.slice(1))
    }
    else if (is_Letrec(matchers)) {
        if (matchers.length !== 3) {
            throw Error(`unrecognized pattern in the letrec procedure: ${inspect(matchers)}`)
        }

        const bindings = matchers[1].map((item: any[]) => ({ key: item[0], value: build(item[1]) }));

        return match_letrec(bindings, build(matchers[2]))
    }
    else if (is_new_var(matchers)) {
        return match_new_var(matchers[1], build(matchers[2]))
    }
    else if (is_select(matchers)) {
        return match_choose(matchers.slice(1).map((item: any) => build(item)))
    }
    else if (is_match_reference(matchers)) {
        return match_ref(matchers[1])
    }
    else if (isArray(matchers)) {
        return match_array(matchers.map((item: any) => build(item)))
    }
    
    else  {
        throw new Error(`unrecognized pattern: ${inspect(matchers)}`)
    }
}

function run_matcher(matcher: matcher_callback, data: any[], succeed: (env: MatchEnvironment, nEaten: number) => any): any {
    return matcher([data], construct_dict_refs(), succeed, construct_simple_pattern_environment())
}

const test_matcher = build([
    [P.letrec,
        [["palindrome",
        [P.new, ["x"],
            [P.choose, 
                [],
                [[P.element, "x"],
                [P.ref, "palindrome"],
                [P.element, "x"]]
            ]]]],
        [P.ref, "palindrome"]
    ]])


const result = run_matcher(test_matcher, [["a", ["b",[], "b"], "a"]], (env, nEaten) => {
    return {env, nEaten}
})

console.log(result)