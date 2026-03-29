import { will_define } from "./DictValue"

export { will_define }

export type ScopedReference = Map<number, any>

/** Subclass so {@link isSucceed} can treat new_match dictionaries like legacy {@link MatchDict}. */
export class NewMatchDictMap extends Map<string, ScopedReference> {}

export type MatchDict = NewMatchDictMap

export const empty_match_dict = (): MatchDict => {
    return new NewMatchDictMap()
}

export const extend_dict = (dict: Map<any, any>, key: any, value: any) => {
    const new_dict = dict instanceof NewMatchDictMap ? new NewMatchDictMap(dict) : new Map(dict)
    new_dict.set(key, value)
    return new_dict
}

export const set_dict = (dict: Map<any, any>, key: any, value: any) => {
    const new_dict = dict instanceof NewMatchDictMap ? new NewMatchDictMap(dict) : new Map(dict)
    new_dict.set(key, value)
    return new_dict
}

export const extend_dict_scoped = (dict: Map<any, any>, key: any, scope_ref: number, value: any) => {
    return extend_dict(
        dict, 
        key, 
        extend_dict(
            dict.get(key) || new Map(), 
            scope_ref, value)
    )
}

export const get_dict = (dict: Map<any, any>, key: any) => {
    return dict.get(key)
}

export const get_dict_scoped = (dict: Map<any, any>, key: any, scope_ref: number) => {
    return dict.get(key)?.get(scope_ref)
}

/** Walk env_pointers in order (innermost first); first defined binding wins — same as MatchDict/generic get_value. */
export const lookup_scoped = (dict: MatchDict, key: string, env_pointers: number[]): any => {
    let idx = 0
    while (idx < env_pointers.length) {
        const ref = env_pointers[idx]
        const scoped = dict.get(key)
        if (scoped !== undefined && scoped !== null) {
            const result = scoped.get(ref)
            if (result !== undefined && result !== null) {
                return result
            }
        }
        idx = idx + 1
    }
    return undefined
}

export const default_match_env = (): number[] => {
    return [0]
}
