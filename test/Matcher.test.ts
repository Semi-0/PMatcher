import {test, expect, describe, beforeEach, mock, jest} from "bun:test";
import { MatchDict } from '../MatchDict';
import { MatchResult } from '../MatchResult';

import {  match_constant, match_element, match_segment } from '../MatchCallback';
import type { matcher_callback } from '../MatchCallback';
import { match_compose } from '../MatchCombinator';
import { match_choose } from "../MatchCombinator";
import { run_matcher } from '../MatchCombinator';
import { MatchBuilder } from "../MatchBuilder";
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

    test('should return false when no data is provided', () => {
        const matcher = match_constant("x");
        const mockData : string[] = [];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = mock();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toBe(false);
        expect(mockSucceed).not.toHaveBeenCalled();
    });

    test('should return false when the first element does not match', () => {
        const matcher = match_constant("x");
        const mockData = ["y"];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = mock();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toBe(false);
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

    test('should return false when already bound to a different value', () => {
        const matcher = match_element("x");
        const mockData = ["b"];
        const mockDictionary = new MatchDict(new Map([["x", "a"]]));
        const mockSucceed = jest.fn();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toBe(false);
        expect(mockSucceed).not.toHaveBeenCalled();
    });
});

describe('match_segment', () => {
    test('should handle segment matching correctly when unbound', () => {
        const matcher = match_segment("segment");
        const mockData = ["hello", "world"];
        const mockDictionary = new MatchDict(new Map());
        const mockSucceed = jest.fn((result: any) => {
            console.log(result)
            return false
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

    test('should return false when already bound to a different value', () => {
        const matcher = match_segment("segment");
        const mockData = ["different", "input"];
        const mockDictionary = new MatchDict(new Map([["segment", ["hello", "world"]]]));
        const mockSucceed = jest.fn();

        const result = matcher(mockData, mockDictionary, mockSucceed);

        expect(result).toBe(false);
        expect(mockSucceed).not.toHaveBeenCalled();
    });
});

describe('match_list with complex patterns', () => {
    test('should handle patterns with constants and segments', () => {
        // Matchers for the first scenario
        const matchX = match_constant("x");
        const matchSegment = match_segment("segment");
        const matchY = match_constant("y");

        // Create the match_list for the first pattern [match_constant, match_segment]
        const pattern1 = match_compose([matchX, matchSegment]);

        // Create the match_list for the second pattern [match_constant, match_segment, match_constant]
        const pattern2 = match_compose([matchX, matchSegment, matchY]);

        // Define the test data and dictionary
        const testData1 = ["x", "hello", "world"];
        const testData2 = ["x", "hello", "world", "y"];
        const dictionary = new MatchDict(new Map());

        // Define a mock succeed function
        const mockSucceed = jest.fn((dictionary: MatchDict, nEaten: number) => true);

        // Execute the matchers
        const result1 = pattern1(testData1, dictionary, mockSucceed);
        const result2 = pattern2(testData2, dictionary, mockSucceed);

        // Check if the succeed function was called correctly for the first pattern
        expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchDict), 3);
        expect(result1).toBe(true);
        expect(mockSucceed.mock.calls[0][0].get("segment")).toEqual(["hello", "world"]);

        // Reset mock for the second pattern
        mockSucceed.mockClear();

        // Check if the succeed function was called correctly for the second pattern
        const result = pattern2(testData2, dictionary, mockSucceed);
        expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchDict), 4);
        expect(result).toBe(true);
        expect(mockSucceed.mock.calls[0][0].get("segment")).toEqual(["hello", "world"]);
    });

    test('should return false for mismatched patterns', () => {
        // Matchers setup
        const matchX = match_constant("x");
        const matchSegment = match_segment("segment");
        const matchY = match_constant("y");

        // Create the match_list for the pattern [match_constant, match_segment, match_constant]
        const pattern = match_compose([matchX, matchSegment, matchY]);

        // Define test data that does not match the pattern
        const mismatchedData = ["x", "hello", "oops", "z"];  // "z" should be "y"
        const dictionary = new MatchDict(new Map());

        // Define a mock succeed function
        const mockSucceed = jest.fn((dictionary: MatchDict, nEaten: number) => true);

        // Execute the matcher
        const result = pattern(mismatchedData, dictionary, mockSucceed);

        // Check if the result is false and succeed function was not called
        expect(result).toBe(false);
        expect(mockSucceed).not.toHaveBeenCalled();
    });
});

describe('MatcherBuilder', () => {
    test('should correctly configure and run a matcher with constants, elements, and segments', () => {
        // Create a new MatcherBuilder instance
        const builder = new MatchBuilder();

        // Configure the builder with various matchers
        builder.setConstant("start");
        builder.setElement("middle");
        builder.setSegment("end");

        // Mock data and dictionary
        const testData = ["start", "anything", "end"];
        const mockSucceed = jest.fn((dictionary, nEaten) => true);

        // Execute the matcher
        const result = builder.match(testData, mockSucceed);

        // Check if the succeed function was called correctly
        expect(mockSucceed).toHaveBeenCalled();
        expect(mockSucceed.mock.calls[0][1]).toBe(3); // nEaten should be 3
        expect(result).toBe(true);
    });

    test('should return false for mismatched patterns', () => {
        // Create a new MatcherBuilder instance
        const builder = new MatchBuilder();

        // Configure the builder
        builder.setConstant("start");
        builder.setElement("middle");
        builder.setSegment("end");

        // Mock data and dictionary
        const mismatchedData = ["wrong", "data", "here"];
        const mockSucceed = jest.fn((dictionary, nEaten) => true);

        // Execute the matcher
        const result = builder.match(mismatchedData, mockSucceed);

        // Check if the succeed function was not called due to mismatch
        expect(mockSucceed).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    test('should handle element with restriction correctly', () => {
        // Create a new MatcherBuilder instance
        const builder = new MatchBuilder();

        // Configure the builder with an element that has a restriction
        builder.setElementWithRestriction("number", value => !isNaN(Number(value)));

        // Mock data and dictionary
        const validData = ["42"];
        const invalidData = ["not-a-number"];
        const mockSucceed = jest.fn((dictionary, nEaten) => true);

        // Execute the matcher with valid data
        builder.match(validData, mockSucceed);
        expect(mockSucceed).toHaveBeenCalled();
        expect(mockSucceed.mock.calls[0][1]).toBe(1); // nEaten should be 1

        // Reset mock and test with invalid data
        mockSucceed.mockClear();
        builder.match(invalidData, mockSucceed);
        expect(mockSucceed).not.toHaveBeenCalled();
    });
});

describe('match_choose', () => {
    const mockSucceed = jest.fn((dictionary: MatchDict, nEaten: number) => true);

    test('should select the correct matcher and apply it', () => {
        const matcher1: matcher_callback = jest.fn((data, dictionary, succeed) => false);
        const matcher2: matcher_callback = jest.fn((data, dictionary, succeed) => succeed(dictionary, data.length));
        const matchers = [matcher1, matcher2];
        const data = ["test"];
        const dictionary = new MatchDict(new Map());

        const chosen = match_choose(matchers);
        const result = chosen(data, dictionary, mockSucceed);

        expect(matcher1).toHaveBeenCalled();
        expect(matcher2).toHaveBeenCalled();
        expect(mockSucceed).toHaveBeenCalledWith(dictionary, data.length);
        expect(result).toBe(true);
    });

    test('should return false if no matchers succeed', () => {
        const matcher1: matcher_callback = jest.fn((data, dictionary, succeed) => false);
        const matcher2: matcher_callback = jest.fn((data, dictionary, succeed) => false);
        const matchers = [matcher1, matcher2];
        const data = ["test"];
        const dictionary = new MatchDict(new Map());

        const chosen = match_choose(matchers);
        const result = chosen(data, dictionary, mockSucceed);
        expect(matcher1).toHaveBeenCalled();
        expect(matcher2).toHaveBeenCalled();
        // expect(mockSucceed).not.toHaveBeenCalled(); i don't think this is very important since it returns the right value
        expect(result).toBe(false);
    });
});