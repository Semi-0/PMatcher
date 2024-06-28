# pmatcher

To install this library, run:
```bash
bun install pmatcher
```

or 

```bash
npm install pmatcher
```
 # Using MatchBuilder

The `match_builder` function allows you to build and run custom pattern matchers. Here's a basic example of how to use it:

```typescript
// Example usage of match_builder
import { match_builder, run_matcher } from 'pmatcher/MatchBuilder';
import { MatchDict } from 'pmatcher/MatchDict';
// Define patterns using the builder function
const matcher = match_builder(["Hello", ["John", match_segment("details"), "Unrelated"]]);
// Example data array
const data = ["Hello", ["John", "age:30", "location:NY", "Unrelated"]];

// Define a success callback
function onSuccess(matchDict: MatchDict, nEaten: number) {
   console.log(Matched Dictionary:, matchDict);
   console.log(Number of elements processed:, nEaten);
}

// Run the matcher on the data
const result = run_matcher(matcher, data, onSuccess);
console.log(result);
```

output:
```
Matched Dictionary: {
  "details": ["age:30", "location:NY"]
}
Number of elements processed: 2
```


This example demonstrates how to use the `match_builder` and `run_matcher` functions to create a matcher that matches a constant string "Hello" followed by a segment containing details. The `onSuccess` callback is called when the matcher successfully matches the data, and it logs the matched dictionary and the number of elements processed.

## Using "..." Pattern

The `"..."` pattern is used to match any remaining elements in the data array. Here's an example:
```typescript
// Example usage of "..." pattern
import { match_builder, run_matcher } from 'pmatcher/MatchBuilder';
import { MatchDict } from 'pmatcher/MatchDict';
// Define patterns using the builder function
const matcher = match_builder(["start","...", match_element("e")]);
// Example data array
const data = ["start", 1, 2, 3, "end"];

// Define a success callback
function onSuccess(matchDict: MatchDict, nEaten: number) {
   console.log(Matched Dictionary:, matchDict);
   console.log(Number of elements processed:, nEaten);
}

// Run the matcher on the data
run_matcher(matcher, data, onSuccess);

```
output:
```
Matched Dictionary: {
  "e": "end" 
}
Number of elements processed: 5
```


## Matching Nested Array
```typescript
// Example usage of matching nested arrays with match element
import { match_builder, run_matcher } from 'pmatcher/MatchBuilder';
import { MatchDict } from 'pmatcher/MatchDict';
// Define patterns using the builder function
const nestedMatcherWithElement = match_builder(["start", [ "subStart", match_element("key")], "subEnd"], "end"]);
// Example data array
const nestedDataWithElement = ["start", ["subStart", "actualValue", "subEnd"], "end"];

// Define a success callback
function onNestedSuccessWithElement(matchDict: MatchDict, nEaten: number) {
  console.log('Matched Dictionary:', matchDict);
  console.log('Number of elements processed:', nEaten);
}

// Run the matcher on the data
run_matcher(nestedMatcherWithElement, nestedDataWithElement, onNestedSuccessWithElement);

```
output:
```
Matched Dictionary: {
  "key": "actualValue"
}
Number of elements processed: 3
```



## Tail Recursion with match_letrec

The `match_letrec` function allows you to define recursive patterns. Here's an example demonstrating how to handle tail recursive patterns:

```typescript
// Example usage of match_letrec with tail recursion
import { match_letrec, match_choose, match_array, match_constant, match_reference, run_matcher } from 'pmatcher/MatchBuilder';
import { emptyEnvironment, MatchEnvironment } from 'pmatcher/MatchEnvironment';
// Define recursive patterns using match_letrec
const matcher = match_builder(["m:letrec",[
                              ["a", ["m:choose", [], [ "1", match_reference("b")]]],
                              ["b", ["m:choose", [], [ "2", match_reference("a")]]]
                              ], match_reference("a")])
// Example data array
const data = [["1", ["2", ["1", ["2", []]]]]];

// Define a success callback
function onSuccess(environment: MatchEnvironment, nEaten: number) {
  console.log("Matched Environment:", environment);
  console.log("Number of elements processed:", nEaten);
}

// Run the matcher on the data
run_matcher(matcher, data, onSuccess);

```


output:
```
Matched Environment: MatchEnvironment { ... }
Number of elements processed: 1
```

i also tried to implemented an lexical scoping environment for match_letrec but it was not working as expected.
btw, although the definition of environment do look like some sort of lexical scoping,
it has some werid bug made it actually scoped dynamically,
but who the hell needs a lexical scoped pattern matcher anyway.


## Detailed Explanation for MatchCallback.ts and MatchCombinator.ts in MatchBuilder.ts


In MatchBuilder.ts, we utilize functions from MatchCallback.ts and MatchCombinator.ts to construct complex pattern matchers.

1. MatchCallback.ts:
   - This module provides basic building blocks for pattern matching, including:
     - `match_constant`: Matches a specific constant value in the data array.
     - `match_element`: Matches and binds a variable to a value in the data array based on a restriction function.
     - `match_segment`: Matches a sequence of elements in the data array and binds them to a variable.
     - `match_all_other_element`: Matches all remaining elements in the data array.
     - `match_segment_independently`: Matches a segment of the data array where each element satisfies a given restriction independently(means without element or segment or all_other_element in front ).
   


   These functions return a `matcher_callback`, which is a function that takes the data array, a match dictionary, and a success callback, and either succeeds (calling the success callback) or fails (returning a match failure).

2. MatchCombinator.ts:
   - This module provides functions to combine basic matchers into more complex ones:
     - `match_array`: Takes an array of matchers and applies them sequentially to the data array.
     - `match_choose`: Takes an array of matchers and tries each one until one succeeds.

   These combinators allow for building complex matching logic by combining simpler matchers from MatchCallback.ts.

3. Usage in MatchBuilder.ts:
   - `match_builder` function uses these building blocks and combinators to construct a matcher from a pattern array. It interprets the pattern array, converts patterns to matchers using a recursive `loop` function, and combines them using `match_array` or other combinators as needed.
   - `run_matcher` function takes a matcher and data array, and executes the matcher, handling the match result.

By leveraging the functions from MatchCallback.ts and MatchCombinator.ts, MatchBuilder.ts provides a flexible and powerful way to define and execute complex matching rules on data arrays.
*/
