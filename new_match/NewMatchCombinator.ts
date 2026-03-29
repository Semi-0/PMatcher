import { construct, first, get_element, get_length, isArray, isEmpty, isPair, map, reduce, rest, slice } from "../GenericArray"
import { is_empty } from "../helper"
import { is_will_define, will_define } from "../MatchDict/DictValue"
import { extend_dict_scoped, get_dict_scoped, lookup_scoped, type MatchDict } from "../MatchDict/NewMatchDict"
import { new_ref } from "../MatchDict/ScopeReference"
import { current_scope, get_matcher_name, make_matcher, type match_env_pointer, type matcher } from "./MatcherNameStore"
import { MatcherName } from "../NameDict"
import { isFailed, isSucceed } from "../Predicates"
import { is_match_result } from "../MatchResult/MatchResult"
import { createMatchPartialSuccess } from "../MatchResult/PartialSuccess"
import { createMatchFailure, FailedReason } from "../MatchResult/MatchFailure"
import { get_dict, get_eaten, MatchResult } from "../MatchResult/MatchResult"
import { equal } from "../utility"

export const match_element = (
    variable: string,
    critics: (value: any) => boolean = (value: any) => true
) => {
    return make_matcher(MatcherName.Element)((
        data: any[],
        dict: MatchDict,
        env_pointers: match_env_pointer[],
        succeed: (dictionary: MatchDict, nEaten: number) => any
    ) => {
        if (is_empty(data)) {
            return createMatchFailure(MatcherName.Element, FailedReason.UnexpectedEnd, data, null)
        }
        const head = first(data)
        const env_pointer = current_scope(env_pointers)
        const binding_value = get_dict_scoped(dict, variable, env_pointer)

        if (!critics(head)) {
            return createMatchFailure(MatcherName.Element, FailedReason.RestrictionUnmatched, head, null)
        }
        if (is_empty(binding_value) || is_will_define(binding_value, env_pointer)) {
            const extended = extend_dict_scoped(dict, variable, env_pointer, head)
            return succeed(extended, 1)
        }
        if (equal(binding_value, head)) {
            return succeed(dict, 1)
        }
        return createMatchFailure(MatcherName.Element, FailedReason.BindingValueUnmatched, head, null)
    })
}

/** Other combinators use {@link lookup_scoped} for old `get_value({ key, matchEnv }, dict)` semantics. `match_element` uses `get_dict_scoped` + `current_scope` only. */

const internal_match = (
    m: matcher,
    data: any[],
    dict: MatchDict,
    env: match_env_pointer[],
    succeed: (dictionary: MatchDict, nEaten: number) => any
) => m(data, dict, env, succeed)

export const match_constant = (pattern_constant: string) => {
    return make_matcher(MatcherName.Constant)((data, dictionary, _env, succeed) => {
        if (is_empty(data)) {
            return createMatchFailure(MatcherName.Constant, FailedReason.UnexpectedEnd, data, null)
        }
        if (equal(first(data), pattern_constant)) {
            return succeed(dictionary, 1)
        }
        return createMatchFailure(MatcherName.Constant, FailedReason.UnexpectedInput, [first(data), pattern_constant], null)
    })
}

export const match_wildcard = () => {
    return make_matcher(MatcherName.Wildcard)((data, dictionary, _env, succeed) => {
        return succeed(dictionary, 1)
    })
}

export const match_empty = () => {
    return make_matcher(MatcherName.Empty)((data, dictionary, _env, succeed) => {
        if (get_length(data) === 0) {
            return succeed(dictionary, 0)
        }
        return createMatchFailure(MatcherName.Empty, FailedReason.UnexpectedInput, data, null)
    })
}

export const match_segment = (
    variable: string,
    critics: (value: any) => boolean = (value: any) => true
) => {
    const match_segment_equal = (data: any[], value: any[], ok: (i: number) => any): any => {
        for (let i = 0; i < get_length(data); i++) {
            if (!equal(get_element(data, i), get_element(value, i))) {
                return createMatchFailure(MatcherName.Segment, FailedReason.BindingValueUnmatched, get_element(data, i), null)
            }
            if (!critics(get_element(data, i))) {
                return createMatchFailure(MatcherName.Segment, FailedReason.RestrictionUnmatched, get_element(data, i), null)
            }
        }
        return ok(get_length(data))
    }

    return make_matcher(MatcherName.Segment)((data, dictionary, env_pointers, succeed) => {
        const current_env = current_scope(env_pointers)

        const loop = (index: number): any => {
            if (index > get_length(data)) {
                return createMatchFailure(MatcherName.Segment, FailedReason.IndexOutOfBound, [data, ["index", index], ["dict", dictionary]], null)
            }

            if (!critics(get_element(data, index))) {
                return createMatchFailure(MatcherName.Segment, FailedReason.RestrictionUnmatched, get_element(data, index), null)
            }

            const data_to_extend = slice(data, 0, index)
            const result = succeed(extend_dict_scoped(dictionary, variable, current_env, data_to_extend), index)

            if (isSucceed(result)) {
                return result
            }
            return loop(index + 1)
        }

        if (data === undefined || data === null) {
            return createMatchFailure(MatcherName.Segment, FailedReason.UnexpectedEnd, data, null)
        }

        const binding = lookup_scoped(dictionary, variable, env_pointers)

        if (binding === undefined || binding === null || is_will_define(binding, current_env)) {
            return loop(0)
        }

        return match_segment_equal(data, binding, (i) => succeed(dictionary, i))
    })
}

export const match_segment_independently = (
    variable: string,
    restriction: (value: any) => boolean = (value: any) => true
) => {
    const match_segment_all_impl = match_segment(variable, restriction)
    return make_matcher(MatcherName.Segment)((data, dictionary, env_pointers, succeed) => {
        return internal_match(match_segment_all_impl, data, dictionary, env_pointers, (new_dict, nEaten) => {
            if (nEaten === get_length(data)) {
                return succeed(new_dict, nEaten)
            }
            return createMatchFailure(MatcherName.Segment, FailedReason.ToContinue, data, null)
        })
    })
}

export const match_all_other_element = () => {
    return make_matcher(MatcherName.AllOtherElement)((data, dictionary, env_pointers, succeed) => {
        const loop = (index: number): any => {
            if (index >= get_length(data)) {
                return succeed(dictionary, 0)
            }

            if (data === undefined || data === null || isEmpty(data)) {
                return succeed(dictionary, 0)
            }

            const result = succeed(dictionary, index + 1)

            if (isSucceed(result)) {
                return result
            }
            return loop(index + 1)
        }
        return loop(0)
    })
}

export const match_compose = (matchers: matcher[]) => {
    return make_matcher(MatcherName.Compose)((data, dictionary, env_pointers, succeed) => {
        const handleMatchError = (result: any) => {
            if (isFailed(result)) {
                return createMatchFailure(MatcherName.Compose, FailedReason.UnexpectedInput, data, result)
            }
            return result
        }

        const loop = (data_list: any[], ms: matcher[], dict: MatchDict, eaten: number): any => {
            if (isPair(ms)) {
                const m = first(ms)
                const result = internal_match(m, data_list, dict, env_pointers, (new_dict, nEaten) => {
                    return loop(slice(data_list, nEaten), rest(ms), new_dict, eaten + nEaten)
                })

                return handleMatchError(result)
            }
            if (isPair(data_list)) {
                return createMatchFailure(MatcherName.Compose, FailedReason.UnConsumedInput, [data_list, get_length(data_list)], null)
            }
            if (isEmpty(data_list)) {
                return succeed(dict, eaten)
            }
            return createMatchFailure(MatcherName.Compose, FailedReason.UnexpectedEnd, data_list, null)
        }

        return loop(data, matchers, dictionary, 0)
    })
}

export const match_array = (all_matchers: matcher[]) => {
    return make_matcher(MatcherName.Array)((data, dictionary, env_pointers, succeed) => {
        const compose_matcher = match_compose(all_matchers)

        if (data === undefined || data === null) {
            return createMatchFailure(MatcherName.Array, FailedReason.UnexpectedEnd, data, null)
        }
        if (isEmpty(data)) {
            return succeed(dictionary, 0)
        }

        const result = internal_match(
            compose_matcher,
            first(data),
            dictionary,
            env_pointers,
            (dict, nEaten) => new MatchResult(dict as any, nEaten)
        )

        if (isSucceed(result)) {
            const dict = get_dict(result)
            return succeed(dict, 1)
        }
        return createMatchFailure(MatcherName.Array, FailedReason.UnexpectedEnd, data, result)
    })
}

export const match_choose = (matchers: matcher[]) => {
    return make_matcher(MatcherName.Choose)((data, dictionary, env_pointers, succeed) => {
        const failures: any[] = []

        for (const m of matchers) {
            const result = internal_match(m, data, dictionary, env_pointers, succeed)

            if (isSucceed(result)) {
                return result
            }
            failures.push(result)
        }

        return createMatchFailure(MatcherName.Choose, FailedReason.UnexpectedEnd, [
            data,
            ["try pair with matchers:", map(matchers, (mm: matcher) => get_matcher_name(mm))],
            failures
        ], null)
    })
}

export const match_begin = (matchers: matcher[]) => {
    return make_matcher(MatcherName.Begin)((data, dictionary, env_pointers, succeed) => {
        const loop = (remain_matchers: matcher[], succeedResult: any[]): any => {
            if (isEmpty(remain_matchers)) {
                return createMatchFailure(MatcherName.Begin, FailedReason.UnexpectedEmptyInput, data, null)
            }

            const m = first(remain_matchers)
            const result = internal_match(m, data, dictionary, env_pointers, succeed)

            if (isSucceed(result)) {
                if (get_length(remain_matchers) === 1) {
                    return result
                }
                return loop(rest(remain_matchers), construct(result, ...succeedResult))
            }
            if (get_length(succeedResult) === 0) {
                return createMatchFailure(MatcherName.Begin, FailedReason.NonOfTheMatcherSucceed, [data, ["matchers:", matchers]], result)
            }
            return createMatchPartialSuccess(slice(matchers, 0, get_length(succeedResult)), get_length(succeedResult), succeedResult, result)
        }
        return loop(matchers, [])
    })
}

export const match_reference = (reference_symbol: string) => {
    return make_matcher(MatcherName.Reference)((data, dictionary, env_pointers, succeed) => {
        const m = lookup_scoped(dictionary, reference_symbol, env_pointers)

        if (data === undefined || data === null) {
            return createMatchFailure(MatcherName.Reference, FailedReason.UnexpectedEnd, data, null)
        }
        if (m) {
            const result = internal_match(m as matcher, data, dictionary, env_pointers, succeed)

            if (isSucceed(result)) {
                return result
            }
            return createMatchFailure(MatcherName.Reference, FailedReason.UnexpectedEnd, data, result)
        }
        return createMatchFailure(MatcherName.Reference, FailedReason.ReferenceNotFound, data, null)
    })
}

export const match_letrec = (bindings: { key: string; value: matcher }[], body: matcher) => {
    return make_matcher(MatcherName.Letrec)((data, dictionary, env_pointers, succeed) => {
        const new_env_ref = new_ref()
        const new_env = [new_env_ref, ...env_pointers]
        const extended_dict = reduce(
            bindings,
            (acc: MatchDict, binding: { key: string; value: matcher }) =>
                extend_dict_scoped(acc, binding.key, new_env_ref, binding.value),
            dictionary
        )

        return internal_match(body, data, extended_dict, new_env, succeed)
    })
}

export const match_new_var = (names: string[], body: matcher) => {
    return make_matcher(MatcherName.NewVar)((data, dictionary, env_pointers, succeed) => {
        const new_env_ref = new_ref()
        const new_env = [new_env_ref, ...env_pointers]
        const extended_dict = reduce(
            names,
            (acc: MatchDict, name: string) => extend_dict_scoped(acc, name, new_env_ref, will_define),
            dictionary
        )

        return internal_match(body, data, extended_dict, new_env, succeed)
    })
}

// TODO: match_extract_matcher — needs matcher metadata beyond get_matcher_name.

export const match_map = (matcher: matcher, func: matcher) => {
    return make_matcher(MatcherName.Map)((data, dictionary, env_pointers, succeed) => {
        const result = internal_match(matcher, data, dictionary, env_pointers, (dict, nEaten) => {
            const inner = succeed(dict, nEaten)
            if (isSucceed(inner)) {
                const fdict = is_match_result(inner)
                    ? get_dict(inner)
                    : (inner as { dict: MatchDict }).dict
                const fnEaten = is_match_result(inner)
                    ? get_eaten(inner)
                    : (inner as { nEaten: number }).nEaten
                return internal_match(func, slice(data, 0, fnEaten), fdict, env_pointers, succeed)
            }
            return inner
        })
        return result
    })
}

export const match_transform = (transformer: (data: any) => any, matcher: matcher) => {
    return make_matcher(MatcherName.Transform)((data, dictionary, env_pointers, succeed) => {
        if (data === undefined || data === null) {
            return createMatchFailure(MatcherName.Transform, FailedReason.UnexpectedEnd, data, null)
        }
        if (isArray(data)) {
            if (isEmpty(data)) {
                return createMatchFailure(MatcherName.Transform, FailedReason.UnexpectedEmptyInput, data, null)
            }
            const transformed_data = map(data, (d: any) => transformer(d))
            return internal_match(matcher, transformed_data, dictionary, env_pointers, succeed)
        }
        return createMatchFailure(MatcherName.Transform, FailedReason.UnexpectedInput, data, null)
    })
}

export const match_with = (variable: string, matcher: matcher) => {
    return make_matcher(MatcherName.With)((data, dictionary, env_pointers, succeed) => {
        const v = lookup_scoped(dictionary, variable, env_pointers)
        if (v === undefined || v === null) {
            return createMatchFailure(MatcherName.With, FailedReason.UnexpectedEnd, data, null)
        }
        return internal_match(matcher, [v], dictionary, env_pointers, succeed)
    })
}
