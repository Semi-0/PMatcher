import { MatcherName } from "../NameDict"
import { isSucceed } from "../Predicates"
import { createMatchFailure, FailedReason } from "../MatchResult/MatchFailure"
import type { MatchDict } from "../MatchDict/NewMatchDict"
import { make_matcher, type match_env_pointer, type matcher } from "./MatcherNameStore"

function run_submatcher(
    m: matcher,
    data: any[],
    dictionary: MatchDict,
    env: match_env_pointer[]
): any {
    return m(data, dictionary, env, (dict, nEaten) => ({ dict, nEaten }))
}

export function match_object(pattern_obj: Record<string, matcher>): matcher {
    return make_matcher(MatcherName.Object)((
        data: any[],
        dictionary: MatchDict,
        env: match_env_pointer[],
        succeed: (dictionary: MatchDict, nEaten: number) => any
    ): any => {
        if (!data || data.length === 0) {
            return createMatchFailure(MatcherName.Object, FailedReason.UnexpectedEnd, data, null)
        }

        const obj = data[0]

        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
            return createMatchFailure(MatcherName.Object, FailedReason.TypeMismatch, obj, null)
        }

        let currentDict = dictionary
        const keys = Object.keys(pattern_obj)

        for (const key of keys) {
            if (!(key in obj)) {
                return createMatchFailure(MatcherName.Object, FailedReason.MissingKey, [obj, key], null)
            }

            const sub = pattern_obj[key]
            const value = obj[key]
            const result = run_submatcher(sub, [value], currentDict, env)

            if (isSucceed(result)) {
                currentDict = (result as { dict: MatchDict }).dict
            } else {
                return createMatchFailure(MatcherName.Object, FailedReason.ValueMismatch, [obj, key, value], result)
            }
        }

        return succeed(currentDict, 1)
    })
}

export function match_object_partial(pattern_obj: Record<string, matcher>): matcher {
    return make_matcher("match_object_partial")((
        data: any[],
        dictionary: MatchDict,
        env: match_env_pointer[],
        succeed: (dictionary: MatchDict, nEaten: number) => any
    ): any => {
        if (!data || data.length === 0) {
            return createMatchFailure(MatcherName.Object, FailedReason.UnexpectedEnd, data, null)
        }

        const obj = data[0]

        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
            return createMatchFailure(MatcherName.Object, FailedReason.TypeMismatch, obj, null)
        }

        let currentDict = dictionary
        let matchedAny = false
        const keys = Object.keys(pattern_obj)

        for (const key of keys) {
            if (!(key in obj)) {
                continue
            }

            const sub = pattern_obj[key]
            const value = obj[key]
            const result = run_submatcher(sub, [value], currentDict, env)

            if (isSucceed(result)) {
                currentDict = (result as { dict: MatchDict }).dict
                matchedAny = true
            } else {
                return createMatchFailure(MatcherName.Object, FailedReason.ValueMismatch, [obj, key, value], result)
            }
        }

        if (!matchedAny) {
            return createMatchFailure(MatcherName.Object, FailedReason.NoKeysMatched, obj, null)
        }

        return succeed(currentDict, 1)
    })
}
