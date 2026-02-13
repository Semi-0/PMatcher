// Object matching support for PMatcher
import type { matcher_instance } from "./MatchCallback";
import { createMatcherInstance, internal_match } from "./MatchCallback";
import { MatchDict } from "./MatchDict/MatchDict";
import type { MatchEnvironment } from "./MatchEnvironment";
import { MatcherName } from "./NameDict";
import { createMatchFailure, FailedReason } from "./MatchResult/MatchFailure";
import { isSucceed } from "./Predicates";

/**
 * Matches an object against a pattern object.
 * Each key in the pattern must exist in the data object, and its value must match the corresponding matcher.
 * 
 * @param pattern_obj - An object where keys are property names and values are matchers
 * @returns A matcher instance that matches objects
 * 
 * @example
 * // Match { name: "John", age: 30 }
 * match_object({
 *   name: match_constant("John"),
 *   age: match_element("age")
 * })
 */
export function match_object(pattern_obj: Record<string, matcher_instance>): matcher_instance {
    const proc = (
        data: any[],
        dictionary: MatchDict,
        match_env: MatchEnvironment,
        succeed: (dictionary: MatchDict, nEaten: number) => any
    ): any => {
        // Extract the object from the data array
        if (!data || data.length === 0) {
            return createMatchFailure(
                MatcherName.Object,
                FailedReason.UnexpectedEnd,
                data,
                null
            );
        }

        const obj = data[0];

        // Check if obj is an object
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            return createMatchFailure(
                MatcherName.Object,
                FailedReason.TypeMismatch,
                obj,
                null
            );
        }

        // Match each key in the pattern
        let currentDict = dictionary;
        const keys = Object.keys(pattern_obj);

        for (const key of keys) {
            // Check if the key exists in obj
            if (!(key in obj)) {
                return createMatchFailure(
                    MatcherName.Object,
                    FailedReason.MissingKey,
                    [obj, key],
                    null
                );
            }

            const matcher = pattern_obj[key];
            const value = obj[key];

            // Match the value (wrap in array for internal_match)
            const result = internal_match(
                matcher,
                [value],
                currentDict,
                match_env,
                (dict: MatchDict, nEaten: number) => dict
            );

            if (isSucceed(result)) {
                currentDict = result;
            } else {
                return createMatchFailure(
                    MatcherName.Object,
                    FailedReason.ValueMismatch,
                    [obj, key, value],
                    result
                );
            }
        }

        // All keys matched successfully
        return succeed(currentDict, 1);
    };

    return createMatcherInstance(
        MatcherName.Object,
        proc,
        new Map<string, any>([["pattern", pattern_obj]])
    );
}

/**
 * Matches an object with optional keys (any subset of keys can be present).
 * At least one pattern key must exist and match in the input; otherwise fails with NoKeysMatched.
 *
 * @param pattern_obj - An object where keys are property names and values are matchers
 * @returns A matcher instance that matches objects with optional keys
 */
export function match_object_partial(pattern_obj: Record<string, matcher_instance>): matcher_instance {
    const proc = (
        data: any[],
        dictionary: MatchDict,
        match_env: MatchEnvironment,
        succeed: (dictionary: MatchDict, nEaten: number) => any
    ): any => {
        // Extract the object from the data array
        if (!data || data.length === 0) {
            return createMatchFailure(
                MatcherName.Object,
                FailedReason.UnexpectedEnd,
                data,
                null
            );
        }

        const obj = data[0];

        // Check if obj is an object
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            return createMatchFailure(
                MatcherName.Object,
                FailedReason.TypeMismatch,
                obj,
                null
            );
        }

        // Match only the keys that exist in both pattern and data.
        // At least one pattern key must exist and match in the input; otherwise fail.
        let currentDict = dictionary;
        let matchedAny = false;
        const keys = Object.keys(pattern_obj);

        for (const key of keys) {
            // Skip if key doesn't exist in obj (partial matching)
            if (!(key in obj)) {
                continue;
            }

            const matcher = pattern_obj[key];
            const value = obj[key];

            // Match the value (wrap in array for internal_match)
            const result = internal_match(
                matcher,
                [value],
                currentDict,
                match_env,
                (dict: MatchDict, nEaten: number) => dict
            );

            if (isSucceed(result)) {
                currentDict = result;
                matchedAny = true;
            } else {
                return createMatchFailure(
                    MatcherName.Object,
                    FailedReason.ValueMismatch,
                    [obj, key, value],
                    result
                );
            }
        }

        if (!matchedAny) {
            return createMatchFailure(
                MatcherName.Object,
                FailedReason.NoKeysMatched,
                obj,
                null
            );
        }

        return succeed(currentDict, 1);
    };

    return createMatcherInstance(
        MatcherName.Object,
        proc,
        new Map<string, any>([["pattern", pattern_obj], ["partial", true]])
    );
}

