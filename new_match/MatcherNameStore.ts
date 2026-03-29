import { first } from "../GenericArray"
import type { MatchDict } from "../MatchDict/NewMatchDict"
import { register_predicate } from "generic-handler/Predicates"

export type match_env_pointer = number

export const current_scope = (env_pointers: match_env_pointer[]) => {
    return first(env_pointers)
}

export type matcher = (
    data: any[],
    dictionary: MatchDict,
    matchEnv: match_env_pointer[],
    succeed: (dictionary: MatchDict, nEaten: number) => any
) => any

const store = new Map<(...args: any[]) => any, string>()

export const make_matcher = (name: string) =>
(matcher_f: (
    data: any[],
    dict: MatchDict,
    env_pointer: match_env_pointer[],
    succeed: (dictionary: MatchDict, nEaten: number) => any
) => any) => {
    store.set(matcher_f, name)
    return matcher_f
}

export const register_matcher = (name: string, matcherFn: matcher) => {
    store.set(matcherFn, name)
}

export const get_matcher_name = (matcherFn: matcher) => {
    return store.get(matcherFn)
}

/** True when `p` is a combinator function registered via {@link make_matcher}. */
export const is_registered_new_matcher = register_predicate(
    "is_registered_new_matcher",
    (p: any): p is matcher => typeof p === "function" && store.has(p)
)
