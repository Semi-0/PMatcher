import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure"

export const equal = construct_simple_generic_procedure("equal", 2,
    (A: any, B: any) => A === B
)

export const copy = construct_simple_generic_procedure("copy", 1,
    (A: any) => {
        throw Error("unknown object to copy, A: " + A)

    }
)

export function guard(predicate: () => boolean, failure: () => any): void {
    if (!predicate()) {
        throw failure();
    }
}

export const get_length = construct_simple_generic_procedure("get_length", 1,
    (array: any[]) => array.length
)



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


