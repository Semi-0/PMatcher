import { register_predicate } from "generic-handler/Predicates"
import type { MatcherName } from "../NameDict"

export class MatchFailure {
    constructor(
        readonly matcher: string,
        readonly reason: FailedReason,
        readonly data: any,
        readonly subFailure: MatchFailure | null
    ) {}
}

export function createMatchFailure(matcher: string, reason: FailedReason, data: any, subFailure: MatchFailure | null): MatchFailure{
    return new MatchFailure(matcher, reason, data, subFailure)
}

export const is_match_failure = register_predicate("is_match_failure", (x: any): x is MatchFailure => {
    return x instanceof MatchFailure
})

export function getFailedMatcher(matchFailure: MatchFailure) : string{
    return matchFailure.matcher
}

export function getFailedReason(matchFailure: MatchFailure) : FailedReason{
    return matchFailure.reason
}

export function getFailedData(matchFailure: MatchFailure) : any{
    return matchFailure.data
}



export function getFailedSubFailure(matchFailure: MatchFailure) : MatchFailure | null{
    return matchFailure.subFailure
}

export enum FailedReason{
    UnexpectedEnd = "Unexpected end of input",
    UnexpectedInput = "Unexpected input",
    UnexpectedEmptyInput = "Unexpected empty input",
    NonOfTheMatcherSucceed = "Non of the matcher succeed",
    RestrictionUnmatched = "Restriction unmatched",
    BindingValueUnmatched = "Binding value unmatched",
    IndexOutOfBound = "Index out of bound",
    UnConsumedInput = "Unconsumed input",
    ToContinue = "To continue",
    ReferenceNotFound = "Reference not found"
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




