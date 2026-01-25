import { test, expect, describe } from "bun:test";
import { match_object, match_object_partial } from "../MatchObject";
import { match_constant, match_element, match_wildcard } from "../MatchCombinator";
import { run_matcher } from "../MatchBuilder";
import { MatchDict } from "../MatchDict/MatchDict";
import { isSucceed, isFailed } from "../Predicates";
import { get_value } from "../MatchDict/DictInterface";

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
    });
});

