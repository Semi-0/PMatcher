import { MatchDict } from "./MatchDict/MatchDict";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { toString } from "./utility"
import { isElementAccessExpression } from "typescript";

export class MatchResult{
    public readonly success: boolean;
    public readonly dictionary: MatchDict;
    public readonly nEaten: number;

    constructor(public readonly _success: boolean, 
        public readonly _dictionary: MatchDict, 
        public readonly _nEaten: number) {
            this.success = _success;
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

export type MatchFailure = {
    matcher: FailedMatcher;
    reason: FailedReason; 
    data: any;
    position: number;
    subFailure: MatchFailure | null;
}

export function flattenNestedMatchFailure(matchFailure: MatchFailure) : MatchFailure[]{
    const failures: MatchFailure[] = []

    const traceFailures = (matchFailure: MatchFailure) => {
        if (matchFailure.subFailure) {
            failures.push(matchFailure)
            traceFailures(matchFailure.subFailure)
        }
        else{
            return  
        }
    }

    traceFailures(matchFailure)
    return failures
}

export function registerPosition(position: number, matchFailure: MatchFailure) : MatchFailure{
    return {matcher: matchFailure.matcher, reason: matchFailure.reason, data: matchFailure.data, position: position, subFailure: matchFailure.subFailure}
}


export function createMatchFailure(matcher: FailedMatcher, reason: FailedReason, data: any, position: number, subFailure: MatchFailure | null) : MatchFailure{
    return {matcher, reason, data, position, subFailure}
} 


export function isMatchFailure(x: any): x is MatchFailure {
    return typeof x === "object" && x !== null &&
           "matcher" in x && typeof x.matcher === "string" &&
           "reason" in x && typeof x.reason === "string" &&
           "data" in x &&
           "position" in x && typeof x.position === "number" &&
           "subFailure" in x && (x.subFailure === null || isMatchFailure(x.subFailure));
}

export function matchSuccess(x: any) : x is MatchFailure{
    return !isMatchFailure(x)
}


export enum FailedMatcher{
    Constant = "Constant",
    Element = "Element",
    Segment = "Segment",
    Array = "Array",
    Choice = "Choice",
    Reference = "Reference",
    Repeated = "Repeated"
}

export enum FailedReason{
    UnexpectedEnd = "Unexpected end of input",
    UnexpectedInput = "Unexpected input",
    RestrictionUnmatched = "Restriction unmatched",
    BindingValueUnmatched = "Binding value unmatched",
    IndexOutOfBound = "Index out of bound",
    UnConsumedInput = "Unconsumed input",
    ToContinue = "To continue",
    ReferenceNotFound = "Reference not found"
}



define_generic_procedure_handler(toString,
    (x: any) => isMatchFailure(x),
    (x: MatchFailure) => {

        const subFailure = x.subFailure
        if (subFailure) {
            return `${x.reason} at position ${x.position}: ${toString(subFailure)}`
        } else {
            return `${x.reason} at position ${x.position}`
        }
    }
)