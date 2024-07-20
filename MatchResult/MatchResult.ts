import type { MatchDict } from "../MatchDict/MatchDict";
import { get_value } from "../MatchDict/DictInterface";


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

    apply(callback: (...args: any) => any, ...args: string[]) : any{
        const vs = args.map(arg => this.safeGet(arg))
        return callback(...vs)
    }
}


export function is_match_result(x: any): x is MatchResult {
    return x instanceof MatchResult
}