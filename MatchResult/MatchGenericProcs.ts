
import { P } from "../MatchBuilder"
import { match } from "../MatchBuilder"
import { isFailed, isSucceed } from "../Predicates"
import type { MatchFailure } from "./MatchFailure"
import { define_generic_procedure_handler, construct_simple_generic_procedure } from "generic-handler/GenericProcedure"
import { MatchResult, is_match_result } from "./MatchResult"
import { match_args } from "generic-handler/Predicates"
import { is_any } from "generic-handler/built_in_generics/generic_predicates"

const param = [P.segment, "param"]

function get_param_matcher(filterFunctionKeyword: boolean): any[] {
    const patterns = filterFunctionKeyword
        ? [
            ["(", param, ")"],
            ["...", "(", param, ","],
            [param, ","],
            [param, ")"]
        ]
        : [
            ["(", param, ")"],
            ["(", param, ","],
            [param, ","],
            [param, ")"]
        ];

    return [[P.many, 
        [P.transform, 
            (str: string) => str.split(""),
            [P.choose, ...patterns]
        ]
    ]];
}

export function get_callback_expr(): any[] {
    return [
        P.map, 
        [[P.segment, "params"], "=>", "..."], 
        [P.with, ["params"], get_param_matcher(false)]
    ];
}

export function get_function_expr(): any[] {
    return [
        P.map, 
        [[P.segment, "params"], "{\n", "..."], 
        [P.with, ["params"], get_param_matcher(true)]
    ];
}


export function get_function_expr2(): any[] {
    return [
        P.map, 
        ["function", [P.segment, "params"], "{\n", "..."], 
        [P.with, ["params"], get_param_matcher(true)]
    ];
}


export function get_args(func: (...args: any) => any): any[] {
    const func_str = func.toString()

    const result = match(func_str.split(" "), [P.choose, get_callback_expr(), get_function_expr(), get_function_expr2()])
    if (isSucceed(result)){
        return result.safeGet("param").map((item: any) => item.join(""))
    }
    else{
        throw new Error("Function string is not valid" + result)
    }
}


export const apply = construct_simple_generic_procedure("apply", 2, (a: any, b: any) => { throw new Error("Not implemented" + a + b)})

define_generic_procedure_handler(apply, match_args(is_any, is_match_result), (a: (...args: any[]) => any, b: MatchResult) => {
    return a(...get_args(a).map((arg: any) => b.safeGet(arg)))
})




// function regular_func(a: number) {
//     return a
// }

// console.log(regular_func.toString())
// console.log(get_args((a: number) => {a}))

// // const test_func = (x: number, c: number, z: number) => {  return x + c + z }

// console.log(get_args(test_func))