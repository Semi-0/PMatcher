import {test, expect, describe, beforeEach, mock, jest} from "bun:test";
import { MatchDict } from '../MatchDict';
import { MatchResult } from '../MatchResult';
import type { MatchFailure } from "../MatchResult";
import { FailedMatcher, FailedReason } from '../MatchResult';

import {  match_constant, match_element, match_segment } from '../MatchCallback';
import type { matcher_callback } from '../MatchCallback';
import { match_array } from '../MatchCombinator';
import { match_choose } from "../MatchCombinator";
import { run_matcher } from '../MatchBuilder';
import { match_builder } from "../MatchBuilder";
import { createMatchFailure } from "../MatchResult";
import { flattenNestedMatchFailure } from "../MatchResult";

describe('MatchResult', () => {
    let dictionary: MatchDict;
    let matchResult: MatchResult;

    beforeEach(() => {
        // Create a new dictionary and MatchResult before each test
        dictionary = new MatchDict(new Map([
            ['key1', 10],
            ['key2', 20]
        ]));
        matchResult = new MatchResult(true, dictionary, 2);
    });

    test('do function should apply a callback to the dictionary values', () => {
        // Define a callback that sums numbers
        const sumCallback = (...numbers: number[]) => numbers.reduce((a, b) => a + b, 0);

        // Use the `do` function with the sumCallback
        const result = matchResult.do(sumCallback);

        // Expect the result to be the sum of the values in the dictionary
        expect(result).toBe(30); // 10 + 20
    });

    test('do function should handle callbacks that concatenate strings', () => {
        // Adjust the dictionary for string testing

        const testMatchResult = new MatchResult(true, new MatchDict(new Map([
            ['first', 'Hello, '],
            ['second', 'World!']
        ])), 2);

   

        // Define a callback that concatenates strings
        const concatCallback = (...strings: string[]) => strings.join('');

        // Use the `do` function with the concatCallback
        const result = testMatchResult.do(concatCallback);

        // Expect the result to be a concatenation of the values
        expect(result).toBe('Hello, World!');
    });
});

describe('match_eqv', () => {
    test('should call succeed with correct parameters when match is found', () => {
        const matcher = match_constant("x");
        const mockData = ["x"];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = mock();

        matcher(mockData, mockDictionary, mockSucceed);

        expect(mockSucceed).toHaveBeenCalledWith(mockDictionary, 1);
    });

    test('should return MatchFailure when no data is provided', () => {
        const matcher = match_constant("x");
        const mockData : string[] = [];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = mock();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toEqual(expect.objectContaining({
            matcher: FailedMatcher.Constant,
            reason: FailedReason.UnexpectedEnd,
            position: 0
        }));
        expect(mockSucceed).not.toHaveBeenCalled();
    });

    test('should return MatchFailure when the first element does not match', () => {
        const matcher = match_constant("x");
        const mockData = ["y"];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = mock();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toEqual(expect.objectContaining({
            matcher: FailedMatcher.Constant,
            reason: FailedReason.UnexpectedInput,
            position: 0
        }));
        expect(mockSucceed).not.toHaveBeenCalled();
    });
});

describe('match_element', () => {
    test('should handle variable binding correctly when unbound', () => {
        const matcher = match_element("x");
        const mockData = ["a"];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = jest.fn();

        matcher(mockData, mockDictionary, mockSucceed);

        expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        expect(mockSucceed.mock.calls[0][0].get("x")).toBe("a");
    });

    test('should handle variable binding correctly when already bound to the same value', () => {
        const matcher = match_element("x");
        const mockData = ["a"];
        const mockDictionary = new MatchDict(new Map([["x", "a"]]));
        const mockSucceed = jest.fn();

        matcher(mockData, mockDictionary, mockSucceed);

        expect(mockSucceed).toHaveBeenCalledWith(mockDictionary, 1);
    });

    test('should return MatchFailure when already bound to a different value', () => {
        const matcher = match_element("x");
        const mockData = ["b"];
        const mockDictionary = new MatchDict(new Map([["x", "a"]]));
        const mockSucceed = jest.fn();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toEqual(expect.objectContaining({
            matcher: FailedMatcher.Element,
            reason: FailedReason.BindingValueUnmatched,
            position: 0
        }));
        expect(mockSucceed).not.toHaveBeenCalled();
    });
});

describe('match_segment', () => {
    test('should handle segment matching correctly when unbound', () => {
        const matcher = match_segment("segment");
        const mockData = ["hello", "world"];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = jest.fn((result: any) => {
            return createMatchFailure(FailedMatcher.Segment, FailedReason.UnexpectedEnd, mockData, 0, null) 
        });

        matcher(mockData, mockDictionary, mockSucceed);

        expect(mockSucceed).toHaveBeenCalledTimes(2);
        expect(mockSucceed.mock.calls[1][0].get("segment")).toEqual(["hello", "world"]);
        expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchDict), 2);
    });

    test('should handle segment matching correctly when already bound to the same value', () => {
        const matcher = match_segment("segment");
        const mockData = ["hello", "world"];
        const mockDictionary = new MatchDict(new Map([["segment", ["hello", "world"]]]));
        const mockSucceed = jest.fn();

        matcher(mockData, mockDictionary, mockSucceed);

        expect(mockSucceed).toHaveBeenCalledWith(mockDictionary, 2);
    });

    test('should return MatchFailure when already bound to a different value', () => {
        const matcher = match_segment("segment");
        const mockData = ["different", "input"];
        const mockDictionary = new MatchDict(new Map([["segment", ["hello", "world"]]]));
        const mockSucceed = jest.fn();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toEqual(expect.objectContaining({
            matcher: FailedMatcher.Segment,
            reason: FailedReason.BindingValueUnmatched,
            position: 0
        }));
        expect(mockSucceed).not.toHaveBeenCalled();
    });
});

describe('match_list with complex patterns', () => {
    test('should handle pattern with constants and a segment', () => {
        // Matchers for the scenario
        const matchX = match_constant("x");
        const matchSegment = match_segment("segment");

        // Create the match_list for the pattern [match_constant, match_segment]
        const pattern = match_array([matchX, matchSegment]);

        // Define the test data and dictionary
        const testData = [["x", "hello", "world"]];
        const dictionary = new MatchDict(new Map());

        // Define a mock succeed function
        const mockSucceed = jest.fn((dictionary: MatchDict, nEaten: number) => true);

        // Execute the matcher
        const result = pattern(testData, dictionary, mockSucceed);

        // Check if the succeed function was called correctly
        expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        // console.log("result=" + result)
        expect(result).toBe(true);
        expect(mockSucceed.mock.calls[0][0].get("segment")).toEqual(["hello", "world"]);
    });

    test('should handle pattern with constants and a segment including a trailing constant', () => {
        // Matchers for the scenario
        const matchX = match_constant("x");
        const matchSegment = match_segment("segment");
        const matchY = match_constant("y");

        // Create the match_list for the pattern [match_constant, match_segment, match_constant]
        const pattern = match_array([matchX, matchSegment, matchY]);

        // Define the test data and dictionary
        const testData = [["x", "hello", "world", "y"]];
        const dictionary = new MatchDict(new Map());

        // Define a mock succeed function
        const mockSucceed = jest.fn((dictionary: MatchDict, nEaten: number) => true);

        // Execute the matcher
        const result = pattern(testData, dictionary, mockSucceed);

        // Check if the succeed function was called correctly
        expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        expect(result).toBe(true);
        expect(mockSucceed.mock.calls[0][0].get("segment")).toEqual(["hello", "world"]);
    });

    test('should return MatchFailure for mismatched patterns', () => {
        // Matchers setup
        const matchX = match_constant("x");
        const matchSegment = match_segment("segment");
        const matchY = match_constant("y");

        // Create the match_list for the pattern [match_constant, match_segment, match_constant]
        const pattern = match_array([matchX, matchSegment, matchY]);

        // Define test data that does not match the pattern
        const mismatchedData = [["x", "hello", "oops", "z"]];  // "z" should be "y"
        const dictionary = new MatchDict(new Map());

        // Define a mock succeed function
        const mockSucceed = jest.fn((dictionary: MatchDict, nEaten: number) => true);

        // Execute the matcher
        const result = pattern(mismatchedData, dictionary, mockSucceed);

        // Check if the result is false and succeed function was not called
        expect(result).toEqual(expect.objectContaining({
            matcher: FailedMatcher.Array,
            reason: FailedReason.UnexpectedInput,
            position: 0
        }));
        expect(mockSucceed).not.toHaveBeenCalled();
    });



describe('Nested Array Matching Tests', () => {
    test('matches simple nested array structure', () => {
        const nested_matcher_test = match_array([
            match_constant("a"),
            match_constant("b"),
            match_array([
                match_array([
                    match_element("symbol"),
                    match_constant("d")
                ])
            ])
        ]);

        const result = nested_matcher_test([["a", "b", [["c", "d"]]]], new MatchDict(new Map()), (dict, nEaten) => {
            return dict;
        });

        expect(result).not.toBe(false); // Adjust according to what you expect to receive
    });

    test('handles deeper nested arrays', () => {
        const nested_matcher_test = match_array([
            match_constant("a"),
            match_array([
                match_array([
                    match_element("symbol"),
                    match_constant("d")
                ])
            ]),
            match_constant("b")
        ]);

        const result = nested_matcher_test([["a", [["c", "d"]], "b"]], new MatchDict(new Map()), (dict, nEaten) => {
            return dict;
        });

        expect(result).not.toBe(false); // Adjust according to what you expect to receive
    });

});

});

describe('match_builder with run_matcher', () => {
  test('should handle constant patterns correctly', () => {
    const matcher = match_builder(["a", "b", "c"]);
    const data = ["a", "b", "c"];
    const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

    run_matcher(matcher, data, succeed);

    expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
  });

  test('should handle nested array patterns correctly', () => {
    const matcher = match_builder([[["a", "b"], "c"]]);
    const data = [[["a", "b"], "c"]];
    const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

    run_matcher(matcher, data, succeed);

    expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
  });

  test('should handle element matchers correctly', () => {
    const matcher = match_builder([[match_element("x"), "b"]]);
    const data = [["value", "b"]];
    const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

    run_matcher(matcher, data, succeed);

    expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
    expect(succeed.mock.calls[0][0].get("x")).toEqual("value");
  });

  test('should return MatchFailure when patterns do not match', () => {
    const matcher = match_builder(["a", "b"]);
    const data = ["a", "c"];
    const succeed = jest.fn();

    const result : MatchFailure | MatchDict = run_matcher(matcher, data, succeed);

    const failures = flattenNestedMatchFailure(result as MatchFailure)

    expect(failures[1]).toEqual(expect.objectContaining({
        matcher: FailedMatcher.Array,
        reason: FailedReason.UnexpectedInput,
        position: 1
    }));
    expect(succeed).not.toHaveBeenCalled();
  });

  test('should handle complex nested patterns', () => {
    const matcher = match_builder([["a", match_segment("seg")], "c"]);
    const data = [["a", "b", "d"], "c"];
    const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

    run_matcher(matcher, data, succeed);

    expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
    expect(succeed.mock.calls[0][0].get("seg")).toEqual(["b", "d"]);
  });
});
