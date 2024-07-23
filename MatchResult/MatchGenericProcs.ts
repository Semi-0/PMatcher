import { inspect } from "bun"
import { P } from "../MatchBuilder"
import { match } from "../MatchBuilder"
import { isFailed, isSucceed } from "../Predicates"
import type { MatchFailure } from "./MatchFailure"
import { define_generic_procedure_handler, construct_simple_generic_procedure } from "generic-handler/GenericProcedure"


const param = [P.segment, "param"]

function get_param_matcher(filterFunctionKeyword: boolean): any[] {
    const patterns = filterFunctionKeyword
        ? [
            ["...", "(", param, ","],
            [param, ","],
            [param, ")"]
        ]
        : [
            ["(", param, ","],
            [param, ","],
            [param, ")"]
        ];

    return [P.many, [
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

export function get_args(func: (...args: any) => any): any[] {
    const func_str = func.toString()
    const result = match(func_str.split(" "), [P.choose, get_callback_expr(), get_function_expr()])
    if (isSucceed(result)){
        return result.safeGet("param").map((item: any) => item.join(""))
    }
    else{
        throw new Error("Function string is not valid" + inspect(result, {depth: 20}))
    }
}




const test_func = (x: number, c: number, z: number) => {  return x + c + z }

console.log(get_args(test_func))