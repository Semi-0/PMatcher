

import { test, expect, describe, jest } from "bun:test";
import { build, P, run_matcher } from "../MatchBuilder";
import { MatchDict, empty_match_dict } from "../MatchDict/MatchDict";
import type { MatchEnvironment } from "../MatchEnvironment";
import {  default_match_env } from "../MatchEnvironment";
import type { MatchFailure } from "../MatchResult";
import { FailedMatcher, FailedReason, matchSuccess } from "../MatchResult";
import { inspect } from "util";
import { get_value } from "../MatchDict/DictInterface";
import { clearRefHistory } from "../MatchDict/ScopeReference";

describe('MatchBuilder', () => {
    test('should build and match constant patterns correctly', () => {
        const matcher = build(["a"]);
        const data = ["a"];
        const succeed = jest.fn((dict, nEaten) => { return {dict, nEaten} });

        const result = run_matcher(matcher, data, succeed);

        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    test('should build and match element patterns correctly', () => {
        const matcher = build([P.element, "x"]);
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
        const matcher = build([[P.segment, "seg"], "end"]);
        const data = ["seg1", "seg2", "end"];
        const succeed = jest.fn((dict, nEaten) => {return dict});

        const result = run_matcher(matcher, data, succeed);
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        expect(result).toEqual(succeed.mock.results[0].value);
        expect(get_value("seg", result)).toEqual(["seg1", "seg2"]);
    });

    test('should build and match letrec patterns correctly', () => {
        const matcher = build([P.letrec, [["a", [P.constant, "b"]]], [[P.ref, "a"]]]);
        const data = ["b"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);
        
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
           //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    test('should build and match choose patterns correctly', () => {
        const matcher = build([P.choose, [[P.constant, "a"]], [[P.constant, "b"]]]);
        const data = ["a"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);
        console.log(result)
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
           //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });


    test('should build and match complex nested patterns correctly', () => {
        const matcher = build([P.letrec, [["a", [P.constant, "b"]]], [P.choose, [[P.ref, "a"]], [P.constant, "c"]]]);
        const data = ["b"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);

        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
           //@ts-ignore
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    

    test('should return MatchFailure when patterns do not match', () => {
        const matcher = build([P.constant, "a"]);
        const data = ["b"];
        const succeed = jest.fn();

        const result: MatchFailure | MatchDict = run_matcher(matcher, data, succeed);

        expect(result).toEqual(expect.objectContaining({
            matcher: FailedMatcher.Constant,
            reason: FailedReason.UnexpectedInput,
            position: 0
        }));
        expect(succeed).not.toHaveBeenCalled();
    });

    
});

// ... existing imports ...

describe('MatchBuilder', () => {
    // ... existing tests ...

    test('should build and match letrec patterns with choose and reference correctly', () => {
        const test_matcher = build([P.letrec,
            [["a", [P.choose, [], [ "1", [P.ref, "b"]]]],
            ["b", [P.choose, [], [ "2", [P.ref, "a"]]]]],
            [P.ref, "a"]]
        );

        const data = ["1", ["2", ["1", ["2", []]]]];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(test_matcher, data, succeed);

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
            const test_matcher = build([
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
                ]]);

            const result = run_matcher(test_matcher, [["a", ["b", ["c" , [], "c" ], "b"], "a"]], (dict, nEaten) => {
                return dict;
            });

      
            expect(matchSuccess(result)).toBe(true)

        });
    });
});


test('letrec pattern with repeat', () => {
    clearRefHistory()

    const t = build(
        [P.letrec,
            [["repeat", 
                [P.new, ["x"],
                    [P.choose,
                        P.empty,
                        [P.compose,
                            [P.constant, "a"],
                            [P.element, "x"],
                            [P.ref, "repeat"]]]]]],
            [[P.ref, "repeat"]]]
    );

    const r = run_matcher(t, ["a", "b", "a", "d"], (dict, e) => { return dict });

    console.log(r)

    // Expected result
 
    expect(matchSuccess(r)).toEqual(true);
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