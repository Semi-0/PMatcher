import { construct_simple_generic_procedure } from "generic-procedure/GenericProcedure"
// only need to extend this four method to support map over custom array type
export const get_element = construct_simple_generic_procedure("get_element", 2,
    <T>(array: T[], index: number): T => array[index]
)

export const set_element = construct_simple_generic_procedure("set_element", 3,
    <T>(array: T[], index: number, value: T): T[] => {
        const newArray = [...array];
        newArray[index] = value;
        return newArray;
    }
)

export const get_length = construct_simple_generic_procedure("get_length", 1,
    <T>(array: T[]): number => array.length
)

export const isArray = construct_simple_generic_procedure("isArray", 1,
    <T>(obj: any): obj is T[] => Array.isArray(obj)
)

export const push = <T>(array: T[], item: T): T[] => 
    set_element(array, get_length(array), item)

export const slice = <T>(array: T[], start: number, end: number = get_length(array)): T[] => {
    let result: T[] = [];
    for (let i = start; i < end && i < get_length(array); i++) {
        result = push(result, get_element(array, i));
    }
    return result;
}

export const filter = <T>(array: T[], predicate: (item: T) => boolean): T[] => {
    let result: T[] = [];
    for (let i = 0; i < get_length(array); i++) {
        const item = get_element(array, i);
        if (predicate(item)) {
            result = push(result, item);
        }
    }
    return result;
}

export const map = <T, U>(array: T[], mapper: (item: T) => U): U[] => {
    let result: U[] = [];
    for (let i = 0; i < get_length(array); i++) {
        result = push(result, mapper(get_element(array, i)));
    }
    return result;
}

export const reduce = <T, U>(array: T[], reducer: (acc: U, item: T) => U, initial: U): U => {
    let acc = initial;
    for (let i = 0; i < get_length(array); i++) {
        acc = reducer(acc, get_element(array, i));
    }
    return acc;
}

export const first = <T>(array: T[]): T => get_element(array, 0)

export const rest = <T>(array: T[]): T[] => slice(array, 1, get_length(array))


export const second = <T>(array: T[]): T => get_element(array, 1)

export const third = <T>(array: T[]): T => get_element(array, 2)

export const construct = <T>(item: T, ...rest: T[]): T[] => {
    let result: T[] = [item];
    for (let i = 0; i < get_length(rest); i++) {
        result = push(result, get_element(rest, i));
    }
    return result;
}

export const isPair = <T>(array: T[]): boolean => 
    isArray(array) && get_length(array) > 0

export const isEmpty = <T>(array: T[]): boolean => 
    get_length(array) === 0



export const isOriginalArray = isArray