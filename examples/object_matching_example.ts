/**
 * Object Matching Examples for PMatcher
 * 
 * Demonstrates how to use match_object and match_object_partial
 * to pattern match against JavaScript objects
 */

import { match_object, match_object_partial } from "../MatchObject";
import { match_constant, match_element, match_wildcard, match_choose } from "../MatchCombinator";
import { run_matcher } from "../MatchBuilder";
import { MatchDict } from "../MatchDict/MatchDict";
import { get_value } from "../MatchDict/DictInterface";
import { isSucceed } from "../Predicates";

console.log("=== PMatcher Object Matching Examples ===\n");

// Example 1: Simple object matching with constants
console.log("1. Simple object matching:");
const userMatcher = match_object({
    name: match_constant("Alice"),
    age: match_constant(30)
});

const user1 = { name: "Alice", age: 30 };
const result1 = run_matcher(userMatcher, user1, (dict, n) => ({ dict, n }));
console.log("   Matching { name: 'Alice', age: 30 }:", isSucceed(result1) ? "✓ Success" : "✗ Failed");

const user2 = { name: "Bob", age: 30 };
const result2 = run_matcher(userMatcher, user2, (dict, n) => ({ dict, n }));
console.log("   Matching { name: 'Bob', age: 30 }:", isSucceed(result2) ? "✓ Success" : "✗ Failed");

// Example 2: Extracting values with match_element
console.log("\n2. Extracting values:");
const extractMatcher = match_object({
    name: match_element("userName"),
    email: match_element("userEmail"),
    age: match_element("userAge")
});

const user3 = { name: "Charlie", email: "charlie@example.com", age: 25 };
const result3 = run_matcher(extractMatcher, user3, (dict) => dict);

if (isSucceed(result3)) {
    console.log("   Extracted name:", get_value("userName", result3));
    console.log("   Extracted email:", get_value("userEmail", result3));
    console.log("   Extracted age:", get_value("userAge", result3));
}

// Example 3: Nested object matching
console.log("\n3. Nested object matching:");
const nestedMatcher = match_object({
    id: match_element("id"),
    profile: match_object({
        firstName: match_element("first"),
        lastName: match_element("last")
    }),
    status: match_constant("active")
});

const user4 = {
    id: 123,
    profile: {
        firstName: "David",
        lastName: "Smith"
    },
    status: "active"
};

const result4 = run_matcher(nestedMatcher, user4, (dict) => dict);

if (isSucceed(result4)) {
    console.log("   ID:", get_value("id", result4));
    console.log("   First name:", get_value("first", result4));
    console.log("   Last name:", get_value("last", result4));
}

// Example 4: Partial matching (optional keys)
console.log("\n4. Partial matching (optional keys):");
const partialMatcher = match_object_partial({
    name: match_element("name"),
    email: match_element("email"),
    phone: match_element("phone")
});

const user5 = { name: "Eve", email: "eve@example.com" }; // phone is missing
const result5 = run_matcher(partialMatcher, user5, (dict) => dict);

if (isSucceed(result5)) {
    console.log("   Name:", get_value("name", result5));
    console.log("   Email:", get_value("email", result5));
    console.log("   Phone: (not provided)");
}

// Example 5: Using wildcard for "don't care" values
console.log("\n5. Using wildcard:");
const wildcardMatcher = match_object({
    type: match_constant("user"),
    id: match_wildcard(), // Any value accepted
    name: match_element("name")
});

const user6 = { type: "user", id: 999, name: "Frank" };
const result6 = run_matcher(wildcardMatcher, user6, (dict) => dict);

if (isSucceed(result6)) {
    console.log("   Name:", get_value("name", result6));
    console.log("   (ID was matched but not captured)");
}

// Example 6: Combining with choose for alternatives
console.log("\n6. Multiple alternatives with choose:");
const choiceMatcher = match_object({
    status: match_choose([
        match_constant("active"),
        match_constant("pending"),
        match_constant("inactive")
    ]),
    userId: match_element("id")
});

for (const status of ["active", "pending", "inactive", "invalid"]) {
    const testUser = { status, userId: 42 };
    const testResult = run_matcher(choiceMatcher, testUser, (dict) => dict);
    console.log(`   Status '${status}':`, isSucceed(testResult) ? "✓ Matched" : "✗ Failed");
}

console.log("\n=== Examples Complete ===");

