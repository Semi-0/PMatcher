import type { MatchFailure } from "./MatchResult/MatchFailure";
import type { MatchPartialSuccess } from "./MatchResult/PartialSuccess";
import { define_generic_procedure_handler, construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import { is_match_failure } from "./MatchResult/MatchFailure";
import { is_match_partial_success } from "./MatchResult/PartialSuccess";
import { is_match_dict, MatchDict } from "./MatchDict/MatchDict";
import { is_match_result, MatchResult } from "./MatchResult/MatchResult";
import { match_args, register_predicate } from "generic-handler/Predicates";

export const isFailed = construct_simple_generic_procedure("failed", 1, (x: any) => {
    if (typeof x === "boolean") {
        return !x
    }
    else{
        return false
    }
})

define_generic_procedure_handler(isFailed,
    match_args(is_match_failure),
   (x: MatchFailure) => true
)


export const isPartialSuccess = construct_simple_generic_procedure("partialSuccess", 1, (x: any) => {
    return is_match_partial_success(x)
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
    match_args(is_match_result),
    (x: MatchResult) => true
)


define_generic_procedure_handler(isSucceed,
    match_args(is_match_dict),
    (x: MatchDict) => true
)

define_generic_procedure_handler(isSucceed,
    match_args(is_match_result),
    (x: MatchResult) => true
)

define_generic_procedure_handler(isSucceed,
    match_args(is_match_failure),
   (x: MatchFailure) => false
)

define_generic_procedure_handler(isSucceed,
    match_args(is_match_partial_success),
   (x: MatchPartialSuccess) => true
)

// Handler for plain objects with dict and nEaten (common test pattern)
const is_plain_success_object = register_predicate("is_plain_success_object", (x: any): boolean => {
    return typeof x === 'object' && x !== null && 'dict' in x && 'nEaten' in x && !is_match_failure(x)
})

define_generic_procedure_handler(isSucceed,
    match_args(is_plain_success_object),
    (x: any) => true
)

