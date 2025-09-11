import type { MatchFailure } from "./MatchResult/MatchFailure";
import type { MatchPartialSuccess } from "./MatchResult/PartialSuccess";
import { define_generic_procedure_handler, construct_simple_generic_procedure } from "generic-procedure/GenericProcedure";
import { isMatchFailure } from "./MatchResult/MatchFailure";
import { isMatchPartialSuccess } from "./MatchResult/PartialSuccess";
import { is_match_dict, MatchDict } from "./MatchDict/MatchDict";
import { is_match_result, MatchResult } from "./MatchResult/MatchResult";

export const isFailed = construct_simple_generic_procedure("failed", 1, (x: any) => {
    if (typeof x === "boolean") {
        return !x
    }
    else{
        return false
    }
})

define_generic_procedure_handler(isFailed,
    isMatchFailure,
   (x: MatchFailure) => true
)


export const isPartialSuccess = construct_simple_generic_procedure("partialSuccess", 1, (x: any) => {
    return isMatchPartialSuccess(x)
})

export const isSucceed = construct_simple_generic_procedure("succeed", 1, (x: any) => {
    if (typeof x === "boolean") {
        return x
    }
    else{
        return false
    }

})

define_generic_procedure_handler(isSucceed,
    (x: any) => typeof x === "object" && !isFailed(x),
    (x: MatchResult) => true
)


define_generic_procedure_handler(isSucceed,
    is_match_dict,
    (x: MatchDict) => true
)

define_generic_procedure_handler(isSucceed,
    is_match_result,
    (x: MatchResult) => true
)

define_generic_procedure_handler(isSucceed,
    isMatchFailure,
   (x: MatchFailure) => false
)

define_generic_procedure_handler(isSucceed,
    isMatchPartialSuccess,
   (x: MatchPartialSuccess) => true
)

