import { MatchDict } from "./MatchDict";
import type { MatchFailure } from "./MatchResult";
import { createMatchFailure } from "./MatchResult";
import { FailedMatcher, FailedReason } from "./MatchResult";
import { matchSuccess } from "./MatchResult";

export type matcher_callback =  (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any) => any
// needs more precise error handler
// TODO: Support Any Type Done  
// TODO: Composable Matcher Done
// TODO: Match in nested list
// TODO: Match with compiling pattern



export function match_constant(pattern_constant: string): matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any  => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(FailedMatcher.Constant, 
                                      FailedReason.UnexpectedEnd, 
                                      data, 0, null);
        }
        if (data[0] === pattern_constant) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(FailedMatcher.Constant, 
                                      FailedReason.UnexpectedInput, 
                                      data[0], 0, null);
        }
    };
}

export function match_element(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(FailedMatcher.Element, 
                                      FailedReason.UnexpectedEnd, 
                                      data, 0, null);
        }
        const binding_value = dictionary.get(variable);
        
        if (!restriction(data[0])){
            return createMatchFailure(FailedMatcher.Element, 
                                      FailedReason.RestrictionUnmatched, 
                                      data[0], 0, null);
        }

        if (binding_value === undefined) {
            const extendedDictionary = dictionary.extend(variable, data[0]);
            return succeed(extendedDictionary, 1);
        } else if (binding_value === data[0]) {
            return succeed(dictionary, 1);
        } else {
            return createMatchFailure(FailedMatcher.Element,
                                      FailedReason.BindingValueUnmatched, 
                                      data[0], 0, null);
        }
    };
}

// export function match_wildcard(): matcher_callback {
//     return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
//         return succeed(dictionary, 0);
//     };
// }

export function match_segment(variable: string, restriction: (value: any) => boolean = (value: any) => true): matcher_callback {

    const loop = (index: number, data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        
        if (index >= data.length) {
            return createMatchFailure(FailedMatcher.Segment, 
                                      FailedReason.IndexOutOfBound, 
                                      data, index, null);
        }
        if (!restriction(data[index])){
            return createMatchFailure(FailedMatcher.Segment, 
                                      FailedReason.RestrictionUnmatched, 
                                      data[index], index, null);
        }

        const result = succeed(dictionary.extend(variable, data.slice(0, index + 1)), index + 1);

        if (matchSuccess(result)) {
            return result;
        }
        return loop(index + 1, data, dictionary, succeed);
    };

    const match_segment_equal = (data: any[], value: any[], ok: (i: number) => any): any => {
        for (let i = 0; i < data.length; i++) {
            if (data[i] !== value[i]) {
                return createMatchFailure(FailedMatcher.Segment, 
                                          FailedReason.BindingValueUnmatched, 
                                          data[i], i, null);
            }
            if (!restriction(data[i])){
                return createMatchFailure(FailedMatcher.Segment, 
                                          FailedReason.RestrictionUnmatched, 
                                          data[i], i, null);
            }
        }
        return ok(data.length);
    };

    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        if (data === undefined || data === null || data.length === 0) {
            return createMatchFailure(FailedMatcher.Segment, 
                                      FailedReason.UnexpectedEnd, 
                                      data, 0, null);
        }

        const binding = dictionary.get(variable);
        if (binding === undefined) {
            return loop(0, data, dictionary, succeed);
        } else {
            return match_segment_equal(data, binding, (i) => succeed(dictionary, i));
        }
    };
}


// let test_data = [1, 2, 3, 4, 5];
// let test_dict = new MatchDict(new Map<string, any>());

// console.log(match_segment("a")(test_data, test_dict, (d, n) => {console.log(d, n); return false }));