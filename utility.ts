import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import type { MatchFailure } from "./MatchResult"
import { isMatchFailure } from "./MatchResult"


export const copy = construct_simple_generic_procedure("copy", 1,
    (A: any) => {
        throw Error("unknown object to copy")
    }
)

export function guard(predicate: () => boolean, failure: () => any): void {
    if (!predicate()) {
        throw failure();
    }
}

export function first(array: any[]): any {
    return array[0]
}

export function rest(array: any[]): any[] {
    return array.slice(1)
}

export function construct(item: any, ...rest: any[]): any {
    return [item, ...rest]
}

export function isPair(array: any[]): boolean {
    return isArray(array) && array.length !== 0 && array !== null && array !== undefined
}

export function isEmptyArray(array: any[]): boolean {
    return array.length === 0
}

export function isArray(obj: any): boolean {
    return Array.isArray(obj)
}

export function isString(obj: any): boolean {
    return typeof obj === "string"
}

export function isMatcher(obj: any): boolean {
    return typeof obj === "function"
}


export const toString = construct_simple_generic_procedure(
    "toString",
    1,
    (x: any) => x.toString()
)


