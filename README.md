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

typescript
// Example usage of match_builder
import { match_builder, run_matcher } from 'pmatcher/MatchBuilder';
import { MatchDict } from 'pmatcher/MatchDict';
// Define patterns using the builder function
const matcher = match_builder([
"Hello",
["name", match_segment("details")]
]);
// Example data array
const data = ["Hello", ["John", "age:30", "location:NY"]];
// Define a success callback
function onSuccess(matchDict: MatchDict, nEaten: number) {
console.log(Matched Dictionary:, matchDict);
console.log(Number of elements processed:, nEaten);
}
// Run the matcher on the data
const result = run_matcher(matcher, data, onSuccess);
console.log(result);



This example demonstrates how to use the `match_builder` and `run_matcher` functions to create a matcher that matches a constant string "Hello" followed by a segment containing details. The `onSuccess` callback is called when the matcher successfully matches the data, and it logs the matched dictionary and the number of elements processed.

## Using "..." Pattern

The `"..."` pattern is used to match any remaining elements in the data array. Here's an example:

// Example usage of "..." pattern
import { match_builder, run_matcher } from 'pmatcher/MatchBuilder';
import { MatchDict } from 'pmatcher/MatchDict';
// Define patterns using the builder function
const matcher = match_builder(["start","...","end"]);
// Example data array
const data = ["start", 1, 2, 3, "end"];
// Define a success callback
function onSuccess(matchDict: MatchDict, nEaten: number) {
console.log(Matched Dictionary:, matchDict);
console.log(Number of elements processed:, nEaten);
}
// Run the matcher on the data
const result = run_matcher(matcher, data, onSuccess);
console.log(result);