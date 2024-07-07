

import { test, expect, describe, jest } from "bun:test";
import { build, P, run_matcher } from "../MatchBuilder";
import { MatchDict, empty_match_dict } from "../MatchDict/MatchDict";
import type { MatchEnvironment } from "../MatchEnvironment";
import {  default_match_env } from "../MatchEnvironment";
import type { MatchFailure } from "../MatchResult";
import { FailedMatcher, FailedReason, matchSuccess } from "../MatchResult";
import { inspect } from "util";
import { get_value } from "../MatchDict/DictInterface";

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
        expect(result).toEqual(succeed.mock.results[0].value);
    });

    test('should build and match choose patterns correctly', () => {
        const matcher = build([P.choose, [[P.constant, "a"]], [[P.constant, "b"]]]);
        const data = ["a"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);
        console.log(result)
        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
        expect(result).toEqual(succeed.mock.results[0].value);
    });


    test('should build and match complex nested patterns correctly', () => {
        const matcher = build([P.letrec, [["a", [P.constant, "b"]]], [P.choose, [[P.ref, "a"]], [P.constant, "c"]]]);
        const data = ["b"];
        const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

        const result = run_matcher(matcher, data, succeed);

        expect(succeed).toHaveBeenCalledWith(expect.any(MatchDict), 1);
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

// import {test, expect, describe, beforeEach, mock, jest} from "bun:test";
// import { MatchDict,  empty_match_dict} from '../MatchDict/MatchDict';
// import { MatchResult, isMatchFailure } from '../MatchResult';
// import type { MatchFailure } from "../MatchResult";
// import { FailedMatcher, FailedReason } from '../MatchResult';

// import {  match_constant, match_element, match_segment, match_segment_independently } from '../MatchCallback';
// import type { matcher_callback } from '../MatchCallback';
// import { match_array } from '../MatchCombinator';
// import { match_choose, match_letrec, match_reference } from "../MatchCombinator";
// import { run_matcher, P } from '../MatchBuilder';
// import { build } from "../MatchBuilder";
// import { createMatchFailure } from "../MatchResult";
// import { flattenNestedMatchFailure } from "../MatchResult";
// import { match_all_other_element } from "../MatchCallback";
// import type { MatchEnvironment, createEnvironment, emptyEnvironment } from "../MatchEnvironment";
// import { inspect } from "util";



// describe('match_eqv', () => {
//     test('should call succeed with correct parameters when match is found', () => {
//         const matcher = match_constant("x");
//         const mockData = ["x"];
//         const mockEnvironment = createEnvironment("x", "x");
//         const mockSucceed = mock();

//         matcher(mockData, mockEnvironment, mockSucceed);

//         expect(mockSucceed).toHaveBeenCalledWith(mockEnvironment, 1);
//     });

//     test('should return MatchFailure when no data is provided', () => {
//         const matcher = match_constant("x");
//         const mockData : string[] = [];
//         const mockEnvironment = createEnvironment("x", "x");
//         const mockSucceed = mock();

//         const result = matcher(mockData, mockEnvironment, mockSucceed);

//         expect(result).toEqual(expect.objectContaining({
//             matcher: FailedMatcher.Constant,
//             reason: FailedReason.UnexpectedEnd,
//             position: 0
//         }));
//         expect(mockSucceed).not.toHaveBeenCalled();
//     });

//     test('should return MatchFailure when the first element does not match', () => {
//         const matcher = match_constant("x");
//         const mockData = ["y"];
//         const mockEnvironment = createEnvironment("x", "x");
//         const mockSucceed = mock();

//         const result = matcher(mockData, mockEnvironment, mockSucceed);

//         expect(result).toEqual(expect.objectContaining({
//             matcher: FailedMatcher.Constant,
//             reason: FailedReason.UnexpectedInput,
//             position: 0
//         }));
//         expect(mockSucceed).not.toHaveBeenCalled();
//     });
// });

// describe('match_element', () => {
//     test('should handle variable binding correctly when unbound', () => {
//         const matcher = match_element("x");
//         const mockData = ["a"];
//         const mockEnvironment = emptyEnvironment();
//         const mockSucceed = jest.fn((environment, nEaten) => {
//             return { environment, nEaten };
//         });

//         const result = matcher(mockData, mockEnvironment, mockSucceed);
//         expect(result.environment.get("x")).toBe("a");

//         expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//     });

//     test('should handle variable binding correctly when already bound to the same value', () => {
//         const matcher = match_element("x");
//         const mockData = ["a"];
//         const mockEnvironment = createEnvironment("x", "a");
//         const mockSucceed = jest.fn();

//         matcher(mockData, mockEnvironment, mockSucceed);

//         expect(mockSucceed).toHaveBeenCalledWith(mockEnvironment, 1);
//     });

//     test('should return MatchFailure when already bound to a different value', () => {
//         const matcher = match_element("x");
//         const mockData = ["b"];
//         const mockEnvironment = createEnvironment("x", "a");
//         const mockSucceed = jest.fn();

//         const result = matcher(mockData, mockEnvironment, mockSucceed);

//         expect(result).toEqual(expect.objectContaining({
//             matcher: FailedMatcher.Element,
//             reason: FailedReason.BindingValueUnmatched,
//             position: 0
//         }));
//         expect(mockSucceed).not.toHaveBeenCalled();
//     });
// });

// describe('match_segment', () => {
//     test('should handle segment matching correctly when unbound', () => {
//         const matcher = match_segment("segment");
//         const mockData = ["hello", "world"];
//         const mockEnvironment = emptyEnvironment();
//         const mockSucceed = jest.fn((environment, nEaten) => {
//             return createMatchFailure(FailedMatcher.Segment, FailedReason.ToContinue, mockData, 0, null)
//         });

//         const result = matcher(mockData, mockEnvironment, mockSucceed);

//         expect(mockSucceed).toHaveBeenCalledTimes(2);
//         expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 2);
//     });

//     test('should handle segment matching correctly when already bound to the same value', () => {
//         const matcher = match_segment("segment");
//         const mockData = ["hello", "world"];
//         const mockEnvironment = createEnvironment("segment", ["hello", "world"]);
//         const mockSucceed = jest.fn();

//         matcher(mockData, mockEnvironment, mockSucceed);

//         expect(mockSucceed).toHaveBeenCalledWith(mockEnvironment, 2);
//     });

//     test('should return MatchFailure when already bound to a different value', () => {
//         const matcher = match_segment("segment");
//         const mockData = ["different", "input"];
//         const mockEnvironment = createEnvironment("segment", ["hello", "world"]);
//         const mockSucceed = jest.fn();

//         const result = matcher(mockData, mockEnvironment, mockSucceed);

//         expect(result).toEqual(expect.objectContaining({
//             matcher: FailedMatcher.Segment,
//             reason: FailedReason.BindingValueUnmatched,
//             position: 0
//         }));
//         expect(mockSucceed).not.toHaveBeenCalled();
//     });
// });

// describe('match_list with complex patterns', () => {
//     test("should success when matching empty array", () => {
//         const matcher = match_array([]);
//         const data: any[] = [];
//         const environment = createEnvironment("x", "x");
//         const succeed = jest.fn();

//         matcher(data, environment, succeed);
//         expect(succeed).toHaveBeenCalledWith(environment, 0);
//     })


//     test('should handle pattern with constants and a segment', () => {
//         // Matchers for the scenario
//         const matchX = match_constant("x");
//         const matchSegment = match_segment("segment");

//         // Create the match_list for the pattern [match_constant, match_segment]
//         const pattern = match_array([matchX, matchSegment]);

//         // Define the test data and dictionary
//         const testData = [["x", "hello", "world"]];
//         const environment = createEnvironment("x", "x");

//         // Define a mock succeed function
//         const mockSucceed = jest.fn((environment: MatchEnvironment, nEaten: number) => true);

//         // Execute the matcher
//         const result = pattern(testData, environment, mockSucceed);

//         // Check if the succeed function was called correctly
//         expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         // console.log("result=" + result)
//         expect(result).toBe(true);
//         expect(mockSucceed.mock.calls[0][0].get("segment")).toEqual(["hello", "world"]);
//     });

//     test('should handle pattern with constants and a segment including a trailing constant', () => {
//         // Matchers for the scenario
//         const matchX = match_constant("x");
//         const matchSegment = match_segment("segment");
//         const matchY = match_constant("y");

//         // Create the match_list for the pattern [match_constant, match_segment, match_constant]
//         const pattern = match_array([matchX, matchSegment, matchY]);

//         // Define the test data and dictionary
//         const testData = [["x", "hello", "world", "y"]];
//         const environment = createEnvironment("x", "x");

//         // Define a mock succeed function
//         const mockSucceed = jest.fn((environment: MatchEnvironment, nEaten: number) => true);

//         // Execute the matcher
//         const result = pattern(testData, environment, mockSucceed);

//         // Check if the succeed function was called correctly
//         expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toBe(true);
//         expect(mockSucceed.mock.calls[0][0].get("segment")).toEqual(["hello", "world"]);
//     });

//     test('should return MatchFailure for mismatched patterns', () => {
//         // Matchers setup
//         const matchX = match_constant("x");
//         const matchSegment = match_segment("segment");
//         const matchY = match_constant("y");

//         // Create the match_list for the pattern [match_constant, match_segment, match_constant]
//         const pattern = match_array([matchX, matchSegment, matchY]);

//         // Define test data that does not match the pattern
//         const mismatchedData = [["x", "hello", "oops", "z"]];  // "z" should be "y"
//         const environment = createEnvironment("x", "x");

//         // Define a mock succeed function
//         const mockSucceed = jest.fn((environment: MatchEnvironment, nEaten: number) => true);

//         // Execute the matcher
//         const result = pattern(mismatchedData, environment, mockSucceed);

//         // Check if the result is false and succeed function was not called
//         expect(result).toEqual(expect.objectContaining({
//             matcher: FailedMatcher.Array,
//             reason: FailedReason.UnexpectedInput,
//             position: 0
//         }));
//         expect(mockSucceed).not.toHaveBeenCalled();
//     });



// describe('Nested Array Matching Tests', () => {
//     test('matches simple nested array structure', () => {
//         const nested_matcher_test = match_array([
//             match_constant("a"),
//             match_constant("b"),
//             match_array([
//                 match_array([
//                     match_element("symbol"),
//                     match_constant("d")
//                 ])
//             ])
//         ]);

//         const result = nested_matcher_test([["a", "b", [["c", "d"]]]], createEnvironment("x", "x"), (environment, nEaten) => {
//             return environment;
//         });

//         expect(result).not.toBe(false); // Adjust according to what you expect to receive
//     });

//     test('handles deeper nested arrays', () => {
//         const nested_matcher_test = match_array([
//             match_constant("a"),
//             match_array([
//                 match_array([
//                     match_element("symbol"),
//                     match_constant("d")
//                 ])
//             ]),
//             match_constant("b")
//         ]);

//         const result = nested_matcher_test([["a", [["c", "d"]], "b"]], createEnvironment("x", "x"), (environment, nEaten) => {
//             return environment;
//         });

//         expect(result).not.toBe(false); // Adjust according to what you expect to receive
//     });

// });

// });

// describe('match_builder with run_matcher', () => {
//   test('should handle constant patterns correctly', () => {
//     const matcher = build(["a", "b", "c"]);
//     const data = ["a", "b", "c"];
//     const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//     run_matcher(matcher, data, succeed);

//     expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//   });

//   test('should handle nested array patterns correctly', () => {
//     const matcher = build([[["a", "b"], "c"]]);
//     const data = [[["a", "b"], "c"]];
//     const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//     run_matcher(matcher, data, succeed);

//     expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//   });

//   test('should handle element matchers correctly', () => {
//     const matcher = build([[[P.element, "x"], "b"]]);
//     const data = [["value", "b"]];
//     const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//     run_matcher(matcher, data, succeed);

//     expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//     expect(succeed.mock.calls[0][0].get("x")).toEqual("value");
//   });

//   test('should return MatchFailure when patterns do not match', () => {
//     const matcher = build(["a", "b"]);
//     const data = ["a", "c"];
//     const succeed = jest.fn();

//     const result : MatchFailure | MatchEnvironment = run_matcher(matcher, data, succeed);

//     const failures = flattenNestedMatchFailure(result as MatchFailure)

//     expect(failures[1]).toEqual(expect.objectContaining({
//         matcher: FailedMatcher.Array,
//         reason: FailedReason.UnexpectedInput,
//         position: 1
//     }));
//     expect(succeed).not.toHaveBeenCalled();
//   });

//   test('should handle complex nested patterns', () => {
//     const matcher = build([["a", [P.segment, "seg"]], "c"]);
//     const data = [["a", "b", "d"], "c"];
//     const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//     run_matcher(matcher, data, succeed);

//     expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//     expect(succeed.mock.calls[0][0].get("seg")).toEqual(["b", "d"]);
//   });
// });

// describe('match_segment_all', () => {
//     test('should succeed when the entire segment matches the restriction', () => {
//         const data = [1, 2, 3];
//         const environment = emptyEnvironment();
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const matcher = match_segment_independently("segment", (value) => typeof value === 'number');
//         const result = matcher(data, environment, succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), data.length);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail when the segment does not match the restriction', () => {
//         const data = [1, 2, 'a'];
//         const environment = emptyEnvironment();
//         const succeed = jest.fn();

//         const matcher = match_segment_independently("segment", (value) => typeof value === 'number');
//         const result = matcher(data, emptyEnvironment(), succeed);

//         expect(succeed).not.toHaveBeenCalled();
//         expect(result).toEqual(createMatchFailure(FailedMatcher.Segment, FailedReason.RestrictionUnmatched, 'a', 2, null));
//     });


// });


// describe('Integration Tests for Matchers', () => {
//     test('should match a complex pattern with match_array and match_segment_all', () => {
//         const matcher = match_array([
//             match_constant("start"),
//             match_array([
//                 match_segment_independently("numbers", (value) => typeof value === 'number'),
//             ]),
//             match_constant("end")
//         ]);

//         const data = [["start", [1, 2, 3], "end"]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//         expect(succeed.mock.calls[0][0].get("numbers")).toEqual([1, 2, 3]);
//     });

//     test('should match a pattern with match_choose', () => {
//         const matcher = match_choose([
//             match_constant("a"),
//             match_constant("b"),
//             match_constant("c")
//         ]);

//         const data = ["b"];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should handle nested match_array patterns', () => {
//         const matcher = match_array([
//             match_constant("a"),
//             match_array([
//                 match_element("x"),
//                 match_constant("b")
//             ]),
//             match_constant("c")
//         ]);

//         const data = [["a", ["value", "b"], "c"]];
//         const environment = emptyEnvironment();
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const result = matcher(data, environment, succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//         expect(succeed.mock.calls[0][0].get("x")).toEqual("value");
//     });

//     test('should fail when pattern does not match', () => {
//         const matcher = match_array([
//             match_constant("a"),
//             match_array([
//                 match_segment_independently("numbers", (value) => typeof value === 'number'),
//             ]),
//             match_constant("end")
//         ]);

//         const data = [["a", [1, "oops"], "end"]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn();

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).not.toHaveBeenCalled();
//         expect(isMatchFailure(result)).toBe(true);
//     });
// });


// describe('match_all_other_element', () => {
//     test('should succeed without consuming any input when constant in front matches', () => {
//         const data = [["constant", 1, 2, 3]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const matcher = match_array([
//             match_constant("constant"),
//             match_all_other_element()
//         ]);
//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail when the constant in front does not match', () => {
//         const data = ["wrong_constant", 1, 2, 3];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn();

//         const matcher = match_constant("constant");
//         const result = matcher(data, createEnvironment("x", "x"), (new_dict, nEaten) => {
//             return match_all_other_element()(data.slice(nEaten), new_dict, succeed);
//         });

//         expect(succeed).not.toHaveBeenCalled();
//         expect(result).toEqual(createMatchFailure(FailedMatcher.Constant, FailedReason.UnexpectedInput,["wrong_constant", "constant"], 0, null));

//     });

//     test('should succeed with empty input when constant in front matches', () => {
//         const data = [["constant"]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const matcher = match_array([
//             match_constant("constant"),
//             match_all_other_element()
//         ]);
//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail with empty input when constant in front does not match', () => {
//         const data = ["wrong_constant"];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn();

//         const matcher = match_constant("constant");
//         const result = matcher(data, createEnvironment("x", "x"), (new_environment, nEaten) => {
//             return match_all_other_element()(data.slice(nEaten), new_environment, succeed);
//         });

//         expect(succeed).not.toHaveBeenCalled();
//         expect(result).toEqual(createMatchFailure(FailedMatcher.Constant, FailedReason.UnexpectedInput, ["wrong_constant", "constant"], 0, null));
//     });
// });


// describe('match_all_other_element', () => {
//     test('should succeed without consuming any input when constant in front matches', () => {
//         const data = [["constant", 1, 2, 3]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const matcher = match_array([
//             match_constant("constant"),
//             match_all_other_element()
//         ]);
//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should succeed with pattern ["start", match_all_other_element(), "end"]', () => {
//         const data = [["start", 1, 2, 3, "end"]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const matcher = match_array([
//             match_constant("start"),
//             match_all_other_element(),
//             match_constant("end"),
//         ]);

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail with pattern ["start", match_all_other_element(), "end"] when "start" does not match', () => {
//         const data = [["wrong_start", 1, 2, 3, "end"]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn();

//         const matcher = match_constant("start");
//         const result = matcher(data, createEnvironment("x", "x"), (new_environment, nEaten) => {
//             return match_all_other_element()(data.slice(nEaten), new_environment, (newer_environment, nEaten2) => {
//                 return match_constant("end")(data.slice(nEaten + nEaten2), newer_environment, succeed);
//             });
//         });

//         expect(succeed).not.toHaveBeenCalled();
//         expect(isMatchFailure(result)).toBe(true);
//     });

//     test('should fail with pattern ["start", match_all_other_element(), "end"] when "end" does not match', () => {
//         const data = ["start", 1, 2, 3, "wrong_end"];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn();

//         const matcher = match_constant("start");
//         const result = matcher(data, createEnvironment("x", "x"), (new_environment, nEaten) => {
//             return match_all_other_element()(data.slice(nEaten), new_environment, (newer_environment, nEaten2) => {
//                 return match_constant("end")(data.slice(nEaten + nEaten2), newer_environment, succeed);
//             });
//         });

//         expect(succeed).not.toHaveBeenCalled();
//         expect(isMatchFailure(result)).toBe(true);
//     });
// });


// describe('match_all_other_element integrate with matchBuilder', () => {
//     test('should match a pattern with match_all_other_element', () => {
//         const matcher = build([
//             "start", "...", "end"
//         ]);

//         console.log("matcher: ", inspect(matcher, {showHidden: true}))

//         const data = ["start", "a", "b", "c", "end"];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const result: MatchEnvironment | MatchFailure = run_matcher(matcher, data, succeed);
//         console.log(result)
//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });
// });


// describe('match_choose', () => {
//     test('should succeed with the first matching constant pattern', () => {
//         const matcher = match_choose([
//             match_constant("a"),
//             match_constant("b"),
//             match_constant("c")
//         ]);

//         const data = ["a"];
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should succeed with the second matching constant pattern', () => {
//         const matcher = match_choose([
//             match_constant("a"),
//             match_constant("b"),
//             match_constant("c")
//         ]);

//         const data = ["b"];
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail when no constant patterns match', () => {
//         const matcher = match_choose([
//             match_constant("a"),
//             match_constant("b"),
//             match_constant("c")
//         ]);

//         const data = ["d"];
//         const environment = emptyEnvironment();
//         const succeed = jest.fn();

//         const result = matcher(data, environment, succeed);

//         expect(succeed).not.toHaveBeenCalled();
//         expect(result).toEqual(createMatchFailure(FailedMatcher.Choice, FailedReason.UnexpectedEnd, data, 3, null));
//     });

//     test('should succeed with a more complex pattern', () => {
//         const matcher = match_choose([
//             match_array([match_constant("a"), match_constant("b")]),
//             match_array([match_constant("c"), match_constant("d")])
//         ]);

//         const data = [["c", "d"]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail when nested patterns do not match', () => {
//         const matcher = match_choose([
//             match_array([match_constant("a"), match_constant("b")]),
//             match_array([match_constant("c"), match_constant("d")])
//         ]);

//         const data = [["a", "d"]];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn();

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).not.toHaveBeenCalled();
//         expect(result).toEqual(createMatchFailure(FailedMatcher.Choice, FailedReason.UnexpectedEnd, data, 2, null));
//     });

//     test('should succeed with a pattern that includes an element matcher', () => {
//         const matcher = match_choose([
//             match_constant("a"),
//             match_element("x")
//         ]);

//         const data = ["value"];
//         const environment = emptyEnvironment();
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const result = matcher(data, environment, succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//         expect(succeed.mock.calls[0][0].get("x")).toEqual("value");
//     });

//     test('should succeed with a pattern that includes a segment matcher', () => {
//         const matcher = match_choose([
//             match_constant("a"),
//             match_segment_independently("segment")
//         ]);

//         const data = ["value1", "value2"];
//         const dictionary = new MatchDict(new Map<string, any>());
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 2);
//         expect(result).toEqual(succeed.mock.results[0].value);
//         expect(succeed.mock.calls[0][0].get("segment")).toEqual(["value1", "value2"]);
//     });

//     test('should succeed with a pattern that combines element and segment matchers', () => {
//         const matcher = match_choose([
//             match_constant("a"),
//             match_array([match_element("x"), match_segment("segment")])
//         ]);

//         const data = [["value", "value1", "value2"]];
//         const environment = emptyEnvironment();
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const result = matcher(data, environment, succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//         expect(succeed.mock.calls[0][0].get("x")).toEqual("value");
//         expect(succeed.mock.calls[0][0].get("segment")).toEqual(["value1", "value2"]);
//     });
// });


// describe('match_reference', () => {
//     test('should resolve and match reference correctly', () => {
//         const environment = createEnvironment("ref", (data, environment, succeed) => succeed(environment, 1));
//         const matcher = match_reference("ref");

//         const data = ["value"];
//         const succeed = jest.fn((environment, nEaten) => {return { environment, nEaten }});

//         const result = matcher(data, environment, succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail when reference is not found', () => {
//         const dictionary = new MatchDict(new Map<string, any>());
//         const matcher = match_reference("ref");

//         const data = ["value"];
//         const succeed = jest.fn();

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).not.toHaveBeenCalled();
//         expect(result).toEqual(createMatchFailure(FailedMatcher.Reference, FailedReason.ReferenceNotFound, data, 0, null));
//     });
// });

// describe('match_letrec', () => {
//     test('should handle simple recursive patterns correctly', () => {
//         const matcher = match_letrec([
//             {key: "a", value: match_constant("1")}
//         ], match_reference("a"));

//         const data = ["1"];
//         const dictionary = emptyMatchDict();
//         const succeed = jest.fn((dict, nEaten) => ({ dict, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail when simple recursive patterns do not match', () => {
//         const matcher = match_letrec([
//             {key: "a", value: match_constant("1")}
//         ], match_reference("a"));

//         const data = ["2"];
//         const dictionary = emptyMatchDict();
//         const succeed = jest.fn();

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).not.toHaveBeenCalled();
//         expect(isMatchFailure(result)).toBe(true);
//     });
// });

// describe('match_letrec with tail recursion', () => {
//     test('should handle tail recursive patterns correctly', () => {
//         const matcher = match_letrec([
//             {key: "a", value: match_choose([match_array([]), match_array([match_constant("1"), match_reference("b")])])},
//             {key: "b", value: match_choose([match_array([]), match_array([match_constant("2"), match_reference("a")])])}
//         ], match_reference("a"));

//         const data = [["1", ["2", ["1", ["2", []]]]]];
//         const environment = emptyEnvironment();
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const result = matcher(data, createEnvironment("x", "x"), succeed);

//         expect(succeed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 1);
//         expect(result).toEqual(succeed.mock.results[0].value);
//     });

//     test('should fail when tail recursive patterns do not match', () => {
//         const matcher = match_letrec([  
//             {key: "a", value: match_choose([match_array([]),  match_array([match_constant("1"), match_reference("b")])])},
//             {key: "b", value: match_choose([match_array([]),  match_array([match_constant("2"), match_reference("a")])])}
//         ], match_reference("a"));

//         const data = ["1", ["2", ["1", ["3", []]]]]; // "3" should be "2"
//         const environment = emptyEnvironment();
//         const succeed = jest.fn((environment, nEaten) => ({ environment, nEaten }));

//         const result = matcher(data, environment, succeed);
//         // console.log("result", result)
//         // expect(succeed).not.toHaveBeenCalled();
//         expect(isMatchFailure(result)).toBe(true);
//     });
// });


// describe("match_builder", () => {
//     test("should match letrec pattern correctly", () => {
//         const match_builder_test = build([P.letrec,
//                                                  [["a", [[P.constant, "b"], [P.segment, "segment"]]]], 
//                                                  ["d", [P.ref, "a"]]]);

//         const result = run_matcher(match_builder_test, ["d", ["b", "c", "e"]], (environment, nEaten) => {
//             return { environment, nEaten };
//         });

//         console.log(result);

//         // Add assertions to verify the result
//         expect(result).toBeDefined();
//         expect(result).toHaveProperty("environment");
//         expect(result).toHaveProperty("nEaten");
//         expect(result.environment).toBeInstanceOf(MatchEnvironment);
//         expect(result.nEaten).toBe(1);
//     });


//     test("should match m:choose pattern correctly", () => {
//         const match_builder_test = build([P.choose, ["a"], ["b"]]);

//         const result = run_matcher(match_builder_test, ["a"], (environment, nEaten) => {
//             return { environment, nEaten };
//         });

        
//         console.log("result", result);

//         // Add assertions to verify the result
//         expect(result).toBeDefined();
//         expect(result).toHaveProperty("environment");
//         expect(result).toHaveProperty("nEaten");
//         expect(result.environment).toBeInstanceOf(MatchEnvironment);

//         expect(result.nEaten).toBe(1);
//     });
// });

// describe('match_repeated_patterns with match_array and match_element', () => {
//     const mockSucceed = jest.fn((environment, nEaten) => {return {dict: environment, nEaten: nEaten }});

//     beforeEach(() => {
//         mockSucceed.mockClear();
//     });

//     test('should correctly apply the pattern multiple times', () => {
//         // Define the pattern using match_array and match_element
//         const pattern = match_array([match_element("a"), match_element("b")]);

//         // Create the matcher using match_repeated_patterns
//         const matcher = match_repeated_patterns(pattern);

//         // Define the test data
//         const data = [["1", "2"], ["2", "3"], ["2", "3"], ["2", "3"], ["2", "3"]];
//         const environment = emptyEnvironment();

//         // Execute the matcher
//         const result = matcher(data, environment, mockSucceed);
//         console.log(result)
//         // Check if the succeed function was called correctly
       
//         expect(result.dict.get("a")).toEqual(["1", "2", "2", "2", "2"]);
//         expect(result.dict.get("b")).toEqual(["2", "3", "3", "3", "3"]);
//     });

//     test('should handle non-matching data correctly when data structure is incorrect', () => {
//         const pattern = match_array([match_element("a"), match_element("b")]);
//         const matcher = match_repeated_patterns(pattern);
//         const data = [["1", "2"], ["1", "2", "3"]]; // Second array has an unexpected number of elements
//         const environment = emptyEnvironment();

//         const result = matcher(data, environment, mockSucceed);

//         // expect(mockSucceed).toHaveBeenCalledTimes(0); // Should succeed for the first pair
//         // expect(mockSucceed).toHaveBeenCalledWith(expect.any(MatchEnvironment), 2); // Consumes two elements from the first pair
//         expect(isMatchFailure(result)).toBe(true);
//     });

//     test("should handler integration with matchBuiilder", () => {
//         const match_builder_test = build([[P.repeated, [[P.element, "a"], [P.element, "b"]]]]);
//         const result = run_matcher(match_builder_test, [["1", "2"], ["1", "2"], ["1", "2"]], (environment, nEaten) => {
//             return { dict: environment, nEaten: nEaten };
//         });

//         expect(result.dict.get("a")).toEqual(["1", "1", "1"]);
//         expect(result.dict.get("b")).toEqual(["2", "2", "2"]);
        
//     });

//     test("should handler integration with matchBuiilder with different pattern", () => {
//         const match_builder_test = build([[P.repeated, [[P.constant, "c"], [P.element, "b"]]]]);
//         const result = run_matcher(match_builder_test, [["c", "2"], ["c", "2"], ["c", "2"]], (environment, nEaten) => {
//             return { dict: environment, nEaten: nEaten };
//         });

//         expect(result.dict.get("b")).toEqual(["2", "2", "2"]);
        
//     });

//     test("should handler integration with matchBuiilder with different pattern", () => {
//         const match_builder_test = build([[P.repeated, [[P.constant, "c"], [P.segment, "seg"], [P.element, "b"]]]]);
//         const result = run_matcher(match_builder_test, [["c", "seg1", "seg2", "2"], ["c", "seg1", "seg2", "2"], ["c", "seg1", "seg2", "2"]], (environment, nEaten) => {
//             return { dict: environment, nEaten: nEaten };
//         });

//         console.log(result.dict)

//         expect(result.dict.get("seg")).toEqual([ "seg1", "seg2", "seg1", "seg2", "seg1", "seg2" ]);
//         expect(result.dict.get("b")).toEqual(["2", "2", "2"]);
        
//     });

// });