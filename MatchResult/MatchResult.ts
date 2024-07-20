import type { MatchDict } from "../MatchDict/MatchDict";

export class MatchResult{
    public readonly dictionary: MatchDict;
    public readonly nEaten: number;

    constructor(public readonly _dictionary: MatchDict, 
        public readonly _nEaten: number) {
            this.dictionary = _dictionary;
            this.nEaten = _nEaten;
        }
    
    public operation(callback: (...args: any[]) => any) : any{
         const keys = Array.from(this.dictionary.dict.keys())
         const values = keys.map((key) => this.dictionary.dict.get(key))
         return callback(...values)
    }

    public do(callback: (...args: any[]) => any) : any{
        // short for operation
        return this.operation(callback)
    }
}


export function is_match_result(x: any): x is MatchResult {
    return x instanceof MatchResult
}