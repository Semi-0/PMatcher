import { is_match_dict, type MatchDict } from "../MatchDict/MatchDict";
import { get_value } from "../MatchDict/DictInterface";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { inspect } from "bun";
import { match_args } from "generic-handler/Predicates";
import { is_match_env } from "../MatchEnvironment";
import { match, P } from "../MatchBuilder";
// import { get_args } from "./MatchGenericProcs";

export class MatchResult{
    public readonly dictionary: MatchDict;
    public readonly nEaten: number;

    constructor(public readonly _dictionary: MatchDict, 
        public readonly _nEaten: number) {
            this.dictionary = _dictionary;
            this.nEaten = _nEaten;
        }

    safeGet(key: string) : any{
        return get_value(key, this.dictionary)
    }


    // apply(callback: (...args: any) => any) : any{
    //     const vs = get_args(callback).map(arg => this.safeGet(arg))
    //     return callback(...vs)
    // }
}



export const get_dict = construct_simple_generic_procedure("get_dict", 1, (x: any) => {
    throw new Error("Not implemented", {cause: x})
    
})

export const get_eaten = construct_simple_generic_procedure("get_eaten", 1, (x: any) => {
    // throw new Error("Not implemented")
    return 0
})

// define_generic_procedure_handler(apply, match_args((x: any) => true, is_match_result), (callback, env) => {
//     return env.apply(callback)
// })

define_generic_procedure_handler(get_dict, is_match_result, (x: MatchResult) => {
    return x.dictionary
})

define_generic_procedure_handler(get_dict, is_match_dict, (x: MatchDict) => {
    return x
})

define_generic_procedure_handler(get_eaten, is_match_result, (x: MatchResult) => {
    return x.nEaten
})

export function is_match_result(x: any): x is MatchResult {
    return x instanceof MatchResult
}


// const env = match([1, "a", 2], [[P.element, "a"], "a", [P.element, "b"]])
// console.log(env)
// console.log(apply((x: number, y: number) => {return x + y}, env))
// console.log(get_args((x: number, c:number, y: number) => {return x + y}))