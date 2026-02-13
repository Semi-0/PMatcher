import { isSucceed } from "./Predicates"
import { match  as _match} from "./MatchBuilder"
import { apply } from "./MatchResult/MatchGenericProcs"
import { get_pair_expr, get_pair_exec } from "./MatchBuilder"
import { match_pair } from "./MatchBuilder"
import type { MatchDict } from "./MatchDict/MatchDict"
import { safe_get } from "./MatchResult/MatchResult"
interface MatchBuilder {
    input: any
    else(exec: (...args: any[]) => any): any
    exhausted(): any[]
    match(expr: any[], exec: (...args: any[]) => any): MatchBuilder
}

export const with_rule = (expr: any[], exec: (get: (key: string) => any) => any) => (input: any) => {
    const result = _match(input, expr)
    if (isSucceed(result)){
        return exec(safe_get(result))
    }
    else{
        return undefined
    }
}

const OTHERWISE_SENTINEL = Symbol("otherwise")

export const otherwise = (exec: (...args: any[]) => any) => {
    const combinator = (input: any) => exec(input)
    ;(combinator as any)[OTHERWISE_SENTINEL] = true
    return combinator
}

export const is_otherwise = (combinator: (input: any) => any) => {
    return !!(combinator && (combinator as any)[OTHERWISE_SENTINEL])
}

export const match = (input: any, combinators: ((input: any) => any)[]) => {
    if (!is_otherwise(combinators[combinators.length - 1])){
        throw new Error("Match Nonexhaustive: Last matcher combinator is not otherwise")
    }

    for (const combinator of combinators){
        const result = combinator(input)
        if (result){
            return result
        }
    }
}
