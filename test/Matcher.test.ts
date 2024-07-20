import { test, expect, describe, jest } from "bun:test";
import { compile, P, run_matcher } from "../MatchBuilder";
import { MatchDict, empty_match_dict } from "../MatchDict/MatchDict";
import type { MatchEnvironment } from "../MatchEnvironment";
import {  default_match_env } from "../MatchEnvironment";
import { MatchFailure, FailedReason } from "../MatchResult/MatchFailure";
import { MatchResult } from "../MatchResult/MatchResult";
import { inspect } from "util";
import { get_value } from "../MatchDict/DictInterface";
import { clearRefHistory } from "../MatchDict/ScopeReference";
import { MatcherName } from "../NameDict";
import {getSucceedMatchersNames} from "../MatchResult/PartialSuccess"
import {internal_get_name, internal_get_args, internal_get_vars} from "../MatchCallback"

describe('MatchBuilder', () => {
    test('should build and match constant patterns correctly', () => {
        const matcher = compile(["a"]);
        const data = ["a"];
        const succeed = jest.fn((dict, nEaten) => { return {dict, nEaten} });

        const result = run_matcher(matcher, data, succeed);
        console.log(result)
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    test('should build and match element patterns correctly', () => {
        const matcher = compile([P.element, "x"]);
        const data = ["value"];
        const succeed = jest.fn((dict, nEaten) => {return dict});

        const result = run_matcher(matcher, data, succeed);
        console.log(result)
        
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
        expect(get_value("x", result)).toEqual(data)
        // expect(succeed.mock.calls[0][0].get("x")).toEqual("value");
    });

    test('should build and match segment patterns correctly', () => {
        const matcher = compile([[P.segment, "seg"], "end"]);
        const data = ["seg1", "seg2", "end"];
        const succeed = jest.fn((dict, nEaten) => {return dict});

        const result = run_matcher(matcher, data, succeed);
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        expect(result).toEqual(succeed.mock.results[0].value);
        expect(get_value("seg", result)).toEqual(["seg1", "seg2"]);
    });

    test('should build and match letrec patterns correctly', () => {
        const matcher = compile([P.letrec, [["a", [P.constant, "b"]]], [[P.ref, "a"]]]);
        const data = ["b"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));
     
        const result = run_matcher(matcher, data, succeed);
        console.log("result", result)
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
           //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    test('should build and match choose patterns correctly', () => {
        const matcher = compile([P.choose, [[P.constant, "a"]], [[P.constant, "b"]]]);
        const data = ["a"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);
        console.log(result)
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
           //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });


    test('should build and match complex nested patterns correctly', () => {
        const matcher = compile([P.letrec, [["a", [P.constant, "b"]]], [P.choose, [[P.ref, "a"]], [P.constant, "c"]]], "MEXPR_TO_MATCHER");
        const data = ["b"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);

        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
           //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    

    test('should return MatchFailure when patterns do not match', () => {
        const matcher = compile([P.constant, "a"], "MEXPR_TO_MATCHER");
        const data = ["b"];
        const succeed = jest.fn();

        const result: MatchFailure | MatchDict = run_matcher(matcher, data, succeed);

        expect(result).toEqual(expect.objectContaining({
            matcher: MatcherName.Constant,
            reason: FailedReason.UnexpectedInput
        }));
        expect(succeed).not.toHaveBeenCalled();
    });

    
});

// ... existing imports ...

describe('MatchBuilder', () => {
    // ... existing tests ...

    test('should build and match letrec patterns with choose and reference correctly', () => {
        const test_matcher = compile([P.letrec,
            [["a", [P.choose, [], [ "1", [P.ref, "b"]]]],
            ["b", [P.choose, [], [ "2", [P.ref, "a"]]]]],
            [P.ref, "a"]], "MEXPR_TO_MATCHER");

        const data = ["1", ["2", ["1", ["2", []]]]];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(test_matcher, data, succeed);

        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
           //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    test('should build and match many patterns correctly', () => {
        const matcher = compile([P.many, ["b", [P.element, "a"]]]);
        const data = ["b", "a", "b", "v"];
        const succeed = jest.fn((dict, nEaten) => {return new MatchResult(dict, nEaten)});

        const result = run_matcher(matcher, data, succeed);

        // expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        //@ts-ignore
        expect(isSucceed(result)).toBe(true);
    });

    test('should return MatchFailure when many patterns do not match', () => {
        const matcher = compile([P.many, ["b", [P.element, "a"]]] );
        const data = ["b", "a", "c"];
        const succeed = jest.fn();

        const result: MatchFailure | MatchDict = run_matcher(matcher, data, succeed);

        expect(isFailed(result)).toEqual(true);
        expect(succeed).not.toHaveBeenCalled();
    });

    test('should build and match wildcard patterns correctly', () => {
        const matcher = compile([P.wildcard], "MEXPR_TO_MATCHER");
        const data = ["anything"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);

        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });
    // ... existing tests ...
});

describe('MatchDict', () => {
    // ... existing test suites ...

    describe('Matcher operations', () => {
        test('run_matcher with palindrome pattern', () => {
            const test_matcher = compile([
                [P.letrec,
                    [["palindrome",
                    [P.new, ["x"],
                        [P.choose, 
                            [],
                            [[P.element, "x"],
                            [P.ref, "palindrome"],
                            [P.element, "x"]]
                        ]]]],
                    [P.ref, "palindrome"]
                ]], "MEXPR_TO_MATCHER");

            const result = run_matcher(test_matcher, [["a", ["b", ["c" , [], "c" ], "b"], "a"]], (dict, nEaten) => {
                return dict;
            });

      
            expect(isSucceed(result)).toBe(true)

        });
    });
});


test('letrec pattern with repeat', () => {
    clearRefHistory()

    const t = compile(
        [P.letrec,
            [["repeat", 
                [P.new, ["x"],
                    [P.choose,
                        P.empty,
                        [P.compose,
                            [P.constant, "a"],
                            [P.element, "x"],
                            [P.ref, "repeat"]]]]]],
            [[P.ref, "repeat"]]], "MEXPR_TO_MATCHER");

    const r = run_matcher(t, ["a", "b", "a", "d"], (dict, e) => { return dict });


    // Expected result
 
    expect(isSucceed(r)).toEqual(true);
});


import { DictValue, get_most_bottom_value, construct_dict_value, get_value_sequence } from '../MatchDict/DictValue';
import { new_ref } from '../MatchDict/ScopeReference';

test('get_most_bottom_value returns the correct value', () => {
    const scopeRef = new_ref();
    const value = { key: 'value' };
    const dictValue = construct_dict_value(value, scopeRef);

    const result = get_most_bottom_value(dictValue);
    expect(result).toBe(value);
});

test('get_most_bottom_value throws an error for empty DictValue', () => {
    const dictValue = new DictValue();

    expect(() => get_most_bottom_value(dictValue)).toThrow("attempt to get default value from empty, v:");
});



test('get_most_bottom_value returns the correct value', () => {
    const scopeRef = new_ref();
    const value = { key: 'value' };
    const dictValue = construct_dict_value(value, scopeRef);

    const result = get_most_bottom_value(dictValue);
    expect(result).toBe(value);
});

test('get_most_bottom_value throws an error for empty DictValue', () => {
    const dictValue = new DictValue();

    expect(() => get_most_bottom_value(dictValue)).toThrow("attempt to get default value from empty, v:");
});

test('get_value_sequence returns all values in the map as an array', () => {
    const scopeRef1 = new_ref();
    const scopeRef2 = new_ref();
    const value1 = { key: 'value1' };
    const value2 = { key: 'value2' };
    const dictValue = new DictValue();
    dictValue.referenced_definition.set(scopeRef1, value1);
    dictValue.referenced_definition.set(scopeRef2, value2);

    const result = get_value_sequence(dictValue);
    expect(result).toEqual([value1, value2]);
});

import { extract_var_names } from "../MatchBuilder";
import { isFailed, isPartialSuccess, isSucceed } from "../predicates";

describe('extract_var_names', () => {
    test('should extract variable names from match elements and segments', () => {
        const pattern = [
            [P.element, "x"],
            [P.segment, "y"],
            [P.constant, "a"],
            [P.letrec, [["a", [P.constant, "b"]]], [[P.ref, "a"]]],
            [P.choose, [[P.constant, "a"]], [[P.constant, "b"]]],
            [P.new, ["z"]],
            [P.ref, "a"],
            [P.compose, [P.constant, "a"]],
            P.empty,
            P.wildcard,
            ["nested", [P.element, "nestedVar"]]
        ];

        const result = extract_var_names(pattern);
        expect(result).toEqual(["x", "y", "nestedVar"]);
    });

    test('should return an empty array when there are no variable names', () => {
        const pattern = [
            [P.constant, "a"],
            [P.letrec, [["a", [P.constant, "b"]]], [[P.ref, "a"]]],
            [P.choose, [[P.constant, "a"]], [[P.constant, "b"]]],
            [P.new, ["z"]],
            [P.ref, "a"],
            [P.compose, [P.constant, "a"]],
            P.empty,
            P.wildcard
        ];

        const result = extract_var_names(pattern);
        expect(result).toEqual([]);
    });

    test('should handle nested arrays correctly', () => {
        const pattern = [
            [P.element, "x"],
            ["nested", [P.element, "nestedVar"]],
            ["deeply", ["nested", [P.element, "deepVar"]]]
        ];

        const result = extract_var_names(pattern);
        expect(result).toEqual(["x", "nestedVar", "deepVar"]);
    });

    test('should handle empty patterns', () => {
        const pattern: any[] = [];

        const result = extract_var_names(pattern);
        expect(result).toEqual([]);
    });
});

describe('match_begin', () => {
    const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

    test('should succeed when all matchers succeed', () => {
        const matcher = compile([P.begin, ["a", P.wildcard, P.wildcard], ["a", [P.element, "x"], "b"]]);
        const data = ["a", 42, "b"];
        const result = run_matcher(matcher, data, succeed);
        expect(isSucceed(result)).toBe(true);
      
    });

    test('should return partial success when some matchers succeed', () => {
        const matcher = compile([P.begin, ["a", P.wildcard, P.wildcard], ["a", [P.element, "x"], "c"]]);
        const data = ["a", 42, "b"];
        const result = run_matcher(matcher, data, succeed);

        console.log("result =", result)
        expect(isPartialSuccess(result)).toBe(true);
        expect(getSucceedMatchersNames(result)).toEqual([MatcherName.Array]);
        expect(result.succeedCount).toEqual(1);
    });

    test('should fail when all matchers fail', () => {
        const matcher = compile([P.begin, "x", "y", "z"]);
        const data = ["a", "b", "c"];
        const result = run_matcher(matcher, data, succeed);

        expect(isFailed(result)).toBe(true);
        expect(result.reason).toBe(FailedReason.NonOfTheMatcherSucceed);
        expect(result.partialSuccess).toBeUndefined();
    });
});

describe('extract_matcher', () => {
    test('should extract matcher correctly', () => {
        const matcher = compile([P.extract_matcher, MatcherName.Constant, [[P.constant, "a"], [P.element, "x"], [P.constant, "b"]]]);
        const data = ["a", "value", "b"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);

        expect(isSucceed(result)).toBe(true);
    });

      test('should handle nested matchers', () => {
        // when extract the array, it compare the structure solely
        const matcher = compile([P.extract_matcher, MatcherName.Array, [[P.constant, "a"],  [[P.element, "x"], [P.constant, "b"]], [P.constant, "c"]]]);
        const data = ["e", ["c", "f"], "g"];

        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);
 

        expect(isSucceed(result)).toBe(true);

    });
});


import { get_element, set_element, get_length, isArray } from "../GenericArray";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";

// ... existing imports and tests ...

describe('CustomArray with MatchBuilder', () => {
    class CustomArray<T> {
        constructor(private items: T[]) {}
        
        get(index: number): T {
            return this.items[index];
        }
        
        set(index: number, value: T): void {
            this.items[index] = value;
        }
        
        get length(): number {
            return this.items.length;
        }
    }

    // Extend generic procedures for CustomArray
    define_generic_procedure_handler(get_element,
        (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
        <T>(array: CustomArray<T>, index: number): T => array.get(index)
    );

    define_generic_procedure_handler(set_element,
        (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
        <T>(array: CustomArray<T>, index: number, value: T): CustomArray<T> => {
            array.set(index, value);
            return array;
        }
    );

    define_generic_procedure_handler(get_length,
        (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
        <T>(array: CustomArray<T>): number => array.length
    );

    define_generic_procedure_handler(isArray,
        (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
        <T>(obj: any): obj is CustomArray<T> => obj instanceof CustomArray
    );

    function createCustomArray<T>(...items: T[]): CustomArray<T> {
        return new CustomArray(items);
    }

    test('should match CustomArray with MatchBuilder', () => {
        const customArray = createCustomArray(1, 2, 3, 4, 5);

        const matcherExpr = [
            [P.element, "first"],
            [P.segment, "middle"],
            [P.element, "last"]
        ];

        const result = run_matcher(compile(matcherExpr), customArray, (dict, eaten) => new MatchResult(dict, eaten));

        expect(isSucceed(result)).toBe(true);
        if (isSucceed(result)) {
            // console.log("Match succeeded!");
            // console.log(inspect(result, {showHidden: true, depth: 10}));
            // console.log("safeget:", result.safeGet("middle"))
            // Add more specific assertions here
            expect(isSucceed(result)).toBe(true);
        }
    });
});