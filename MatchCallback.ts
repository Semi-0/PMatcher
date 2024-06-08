import { MatchDict } from "./MatchDict";
import { MatchConstant, MatchElement, MatchSegment } from "./MatchItem";

export type matcher_callback =  (data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any) => any
// needs more precise error handler

export function match_eqv(pattern_constant: MatchConstant): matcher_callback {
    return (data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data.length === 0) {
            return false;
        }
        if (data[0] === pattern_constant.name) {
            return succeed(dictionary, 1);
        } else {
            return false;
        }
    };
}


export function match_element(variable: MatchElement, restriction: (value: string) => boolean = (value: string) => true): matcher_callback {
    return (data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data.length === 0) {
            return false;
        }
        const binding_value = dictionary.get(variable.name);
        
        if (!restriction(data[0])){
            return false
        }

        if (binding_value === undefined) {
            const extendedDictionary = dictionary.extend(variable.name, data[0]);
            return succeed(extendedDictionary, 1);
        } else if (binding_value === data[0]) {
            return succeed(dictionary, 1);
        } else {
            return false;
        }
    };
}

export function match_segment(variable: MatchSegment): matcher_callback {
    const loop = (index: number, data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (index >= data.length) {
            return false;
        }
        const result = succeed(dictionary.extend(variable.name, data.slice(0, index + 1)), index + 1);
        return result !== false ? result : loop(index + 1, data, dictionary, succeed);
    };

    const match_segment_equal = (data: string[], value: string[], ok: (i: number) => any): any => {
        for (let i = 0; i < data.length; i++) {
            if (data[i] !== value[i]) {
                return false;
            }
        }
        return ok(data.length);
    };

    return (data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data.length === 0) {
            return false;
        }

        const binding = dictionary.get(variable.name);
        if (binding === undefined) {
            return loop(0, data, dictionary, succeed);
        } else {
            return match_segment_equal(data, binding, (i) => succeed(dictionary, i));
        }
    };
}

