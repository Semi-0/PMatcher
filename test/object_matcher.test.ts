import { test, expect, describe } from "bun:test";
import { match_object, match_object_partial } from "../MatchObject";
import { match_constant, match_element, match_wildcard } from "../MatchCombinator";
import { run_matcher, match, P } from "../MatchBuilder";
import { MatchDict } from "../MatchDict/MatchDict";
import { isSucceed, isFailed } from "../Predicates";
import { get_value } from "../MatchDict/DictInterface";
import { get_dict } from "../MatchResult/MatchResult";

describe('Object Matching', () => {
    describe('match_object', () => {
        test('should match simple object with constant values', () => {
            const matcher = match_object({
                name: match_constant("John"),
                age: match_constant(30)
            });

            const data = { name: "John", age: 30 };
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
        });

        test('should match object with element bindings', () => {
            const matcher = match_object({
                name: match_element("person_name"),
                age: match_element("person_age")
            });

            const data = { name: "Alice", age: 25 };
            const succeed = (dict: MatchDict, nEaten: number) => dict;

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
            if (isSucceed(result)) {
                expect(get_value("person_name", result)).toBe("Alice");
                expect(get_value("person_age", result)).toBe(25);
            }
        });

        test('should fail when required key is missing', () => {
            const matcher = match_object({
                name: match_constant("John"),
                age: match_constant(30)
            });

            const data = { name: "John" }; // missing 'age'
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isFailed(result)).toBe(true);
        });

        test('should fail when value does not match', () => {
            const matcher = match_object({
                name: match_constant("John"),
                age: match_constant(30)
            });

            const data = { name: "Jane", age: 30 };
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isFailed(result)).toBe(true);
        });

        test('should fail when data is not an object', () => {
            const matcher = match_object({
                name: match_constant("John")
            });

            const data = "not an object";
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isFailed(result)).toBe(true);
        });

        test('should match nested objects', () => {
            const matcher = match_object({
                user: match_object({
                    name: match_element("name"),
                    age: match_element("age")
                }),
                active: match_constant(true)
            });

            const data = {
                user: { name: "Bob", age: 35 },
                active: true
            };
            const succeed = (dict: MatchDict, nEaten: number) => dict;

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
            if (isSucceed(result)) {
                expect(get_value("name", result)).toBe("Bob");
                expect(get_value("age", result)).toBe(35);
            }
        });

        test('should allow extra keys in data', () => {
            const matcher = match_object({
                name: match_constant("John")
            });

            const data = { name: "John", age: 30, city: "NYC" };
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
        });

        test('should match with wildcard', () => {
            const matcher = match_object({
                name: match_constant("John"),
                age: match_wildcard()
            });

            const data = { name: "John", age: 99 };
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
        });
    });

    describe('match_object_partial', () => {
        test('should match when all pattern keys exist', () => {
            const matcher = match_object_partial({
                name: match_constant("John"),
                age: match_constant(30)
            });

            const data = { name: "John", age: 30, city: "NYC" };
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
        });

        test('should match when some pattern keys are missing in data', () => {
            const matcher = match_object_partial({
                name: match_constant("John"),
                age: match_constant(30)
            });

            const data = { name: "John", city: "NYC" }; // 'age' missing
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
        });

        test('should fail when present keys do not match', () => {
            const matcher = match_object_partial({
                name: match_constant("John"),
                age: match_constant(30)
            });

            const data = { name: "Jane", city: "NYC" }; // 'name' doesn't match
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isFailed(result)).toBe(true);
        });

        test('should match with element bindings for partial match', () => {
            const matcher = match_object_partial({
                name: match_element("person_name"),
                age: match_element("person_age"),
                city: match_element("person_city")
            });

            const data = { name: "Alice", age: 25 }; // 'city' missing
            const succeed = (dict: MatchDict, nEaten: number) => dict;

            const result = run_matcher(matcher, data, succeed);

            expect(isSucceed(result)).toBe(true);
            if (isSucceed(result)) {
                expect(get_value("person_name", result)).toBe("Alice");
                expect(get_value("person_age", result)).toBe(25);
                // person_city should not be bound since it wasn't in data
            }
        });

        test('should fail when no pattern keys exist in data', () => {
            const matcher = match_object_partial({
                name: match_constant("John"),
                age: match_constant(30)
            });

            const data = { city: "NYC", country: "USA" }; // no name or age
            const succeed = (dict: MatchDict, nEaten: number) => ({ dict, nEaten });

            const result = run_matcher(matcher, data, succeed);

            expect(isFailed(result)).toBe(true);
        });
    });

    describe('Object pattern via match() (plain object, no P.obj)', () => {
        test('should match object via match(input, { ... })', () => {
            const data = { name: "John", age: 30 };
            const result = match(data, { name: [P.constant, "John"], age: [P.constant, 30] });

            expect(isSucceed(result)).toBe(true);
        });

        test('should extract values via object pattern', () => {
            const data = { name: "Alice", age: 25 };
            const result = match(data, { name: [P.element, "person_name"], age: [P.element, "person_age"] });

            expect(isSucceed(result)).toBe(true);
            if (isSucceed(result)) {
                const dict = get_dict(result);
                expect(get_value("person_name", dict)).toBe("Alice");
                expect(get_value("person_age", dict)).toBe(25);
            }
        });

        test('should fail when key missing', () => {
            const data = { name: "John" };
            const result = match(data, { name: [P.constant, "John"], age: [P.constant, 30] });

            expect(isFailed(result)).toBe(true);
        });

        test('should match nested objects', () => {
            const data = { user: { name: "Bob", age: 35 }, active: true };
            const result = match(data, {
                user: { name: [P.element, "name"], age: [P.element, "age"] },
                active: [P.constant, true]
            });

            expect(isSucceed(result)).toBe(true);
            if (isSucceed(result)) {
                const dict = get_dict(result);
                expect(get_value("name", dict)).toBe("Bob");
                expect(get_value("age", dict)).toBe(35);
            }
        });
    });

    describe('P.partial_obj via match()', () => {
        test('should match when all pattern keys exist', () => {
            const result = match(
                { name: "John", age: 30, city: "NYC" },
                [P.partial_obj, { name: [P.constant, "John"], age: [P.constant, 30] }]
            );
            expect(isSucceed(result)).toBe(true);
        });

        test('should match when some pattern keys are missing in data', () => {
            const result = match(
                { name: "John", city: "NYC" },
                [P.partial_obj, { name: [P.constant, "John"], age: [P.constant, 30] }]
            );
            expect(isSucceed(result)).toBe(true);
        });

        test('should fail when present keys do not match', () => {
            const result = match(
                { name: "Jane", city: "NYC" },
                [P.partial_obj, { name: [P.constant, "John"], age: [P.constant, 30] }]
            );
            expect(isFailed(result)).toBe(true);
        });

        test('should extract values for partial match', () => {
            const result = match(
                { name: "Alice", age: 25 },
                [P.partial_obj, { name: [P.element, "n"], age: [P.element, "a"], city: [P.element, "c"] }]
            );
            expect(isSucceed(result)).toBe(true);
            if (isSucceed(result)) {
                const dict = get_dict(result);
                expect(get_value("n", dict)).toBe("Alice");
                expect(get_value("a", dict)).toBe(25);
            }
        });

        test('should allow extra fields in input (input has more keys than pattern)', () => {
            const result = match(
                { name: "John", age: 30, city: "Boston", country: "USA" },
                [P.partial_obj, { name: [P.constant, "John"], age: [P.constant, 30] }]
            );
            expect(isSucceed(result)).toBe(true);
        });

        test('should fail when no pattern keys exist in input', () => {
            const result = match(
                { city: "NYC", country: "USA" },
                [P.partial_obj, { name: [P.constant, "John"], age: [P.constant, 30] }]
            );
            expect(isFailed(result)).toBe(true);
        });
    });
});

