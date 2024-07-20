import type { matcher_callback } from "../MatchCallback";
import type { MatchFailure } from "../MatchResult/MatchFailure";

export type MatchPartialSuccess = {
    succeedMatchers: string[];
    succeedCount: number;
    results: any[];
    failure: MatchFailure | null;
}

export function isMatchPartialSuccess(x: any) : boolean{
    return x && typeof x === "object" && "succeedMatchers" in x && "succeedCount" in x && "results" in x && "failure" in x
}

export function createMatchPartialSuccess(succeedMatchers: string[], succeedCount: number, results: any[], failure: MatchFailure | null) : MatchPartialSuccess{
    return {succeedMatchers, succeedCount, results, failure}
}

function getSucceedMatchers(partialSuccess: MatchPartialSuccess) : string[]{
    return partialSuccess.succeedMatchers
}

function getSucceedCount(partialSuccess: MatchPartialSuccess) : number{
    return partialSuccess.succeedCount
}

function getResults(partialSuccess: MatchPartialSuccess) : any[]{
    return partialSuccess.results
}