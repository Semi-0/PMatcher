import { isSucceed } from "./Predicates"
import { match } from "./MatchBuilder"
import { apply } from "./MatchResult/MatchGenericProcs"
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