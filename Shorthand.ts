import { isSucceed } from "./Predicates"
import { match } from "./MatchBuilder"
import { apply } from "./MatchResult/MatchGenericProcs"
import { get_value } from "./MatchDict/DictInterface"
import { get_pair_expr, get_pair_exec } from "./MatchBuilder"
import { match_pair } from "./MatchBuilder"
interface MatchBuilder {
    input: any
    match_pairs: any[]
    else(exec: (...args: any[]) => any): any
    exhausted(): any[]
    match(expr: any[], exec: (...args: any[]) => any): MatchBuilder
}

export function match_builder(input: any, match_pairs: any[]): MatchBuilder {
    function matching(){
        for (const pair of match_pairs){
            const result = match(input, get_pair_expr(pair))
            if (isSucceed(result)){
                return apply(get_pair_exec(pair), result)
            }
        }
        return false 
    }

    const self = {
        input,
        match_pairs,
        else(exec: (...args: any[]) => any): any[] {
            const result = matching()
            if (result){
                return result
            }
            else{
                return exec(input)
            }
        },
        exhausted() {
            const result = matching()
            if (result){
                return result
            }
            else{
                throw new Error("No match found")
            }
        },
        match(expr: any[], exec: (...args: any[]) => any): MatchBuilder {
            const copy = match_pairs.slice()
            copy.push(match_pair(expr, exec))
            return match_builder(input, copy)
        }
    }

    return self
}


// Ergonomic ts-pattern-like API that provides a dict fetcher to the handler
type Fetcher = (key: string) => any

type PMatchCase = {
    expr: any[]
    handler: (d: Fetcher) => any
}

export function pmatch(input: any) {
    const cases: PMatchCase[] = []

    function run() {
        for (const { expr, handler } of cases) {
            const result = match(input, expr)
            if (isSucceed(result)) {
                const d: Fetcher = (key: string) => get_value(key, result.dictionary)
                return handler(d)
            }
        }
        return undefined
    }

    return {
        with(expr: any[], handler: (d: Fetcher) => any) {
            cases.push({ expr, handler })
            return this
        },
        otherwise(handler: (input: any) => any) {
            const r = run()
            return r !== undefined ? r : handler(input)
        },
        exhaustive() {
            const r = run()
            if (r !== undefined) return r
            throw new Error("No match found")
        }
    }
}