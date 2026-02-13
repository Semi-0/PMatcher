# pmatcher

A powerful pattern matching library for TypeScript/JavaScript with **backtracking support** and **lexical scoping**.

## Key Features

- **Backtracking Support**: The pattern matcher supports backtracking through `P.choose` and the DSL itself, allowing complex pattern matching with automatic backtracking when a match fails.

- **Lexical Scoping**: The DSL is lexically scoped, enabling recursive pattern definitions with proper variable binding and closure semantics. This is particularly powerful when combined with `match_letrec` for defining recursive patterns.

- **Object Matching**: Plain objects in patterns are auto-detected. Use `{ key: pattern }` for full objects, `[P.partial_obj, {...}]` for optional keys. See [docs/OBJECT_MATCHING.md](docs/OBJECT_MATCHING.md).

- **Shorthand API**: `with_rule`, `otherwise`, and `matchWithRules` for combinator-style matching with multiple rules and a fallback.

## Origins

This library is a TypeScript reimplementation of the matcher system
built in MIT Scheme originally, but extended with lexical scoping
capabilities. The original matcher system was developed as part of
the pattern matching infrastructure used in various Scheme implementations.

This implementation is not a line-by-line translation. It adapts the
core ideas to a modern TypeScript runtime and introduces architectural
changes, most notably extending the system with lexical scoping support
for recursive pattern definitions.

## Documentation

- [docs/](docs/) – Additional documentation
  - [Object Matching](docs/OBJECT_MATCHING.md) – Object patterns, `match_object`, `P.partial_obj`, Shorthand (`with_rule`, `otherwise`, `matchWithRules`)

## Installation

### Quick Start

The easiest way to set up the PMatcher workspace is using the provided install script:

```bash
git clone https://github.com/Semi-0/PMatcher.git
cd PMatcher
./install.sh
```

This script will:
- Clone required workspace dependencies (GenericProcedure)
- Set up the workspace structure
- Install all dependencies using `bun`
- Run tests to verify the installation

### Manual Setup

If you prefer to set up manually:

1. Clone the repository and its dependencies:
```bash
git clone https://github.com/Semi-0/PMatcher.git
git clone https://github.com/Semi-0/GenericProcedure.git
```

2. Create a workspace `package.json` in the parent directory:
```json
{
  "name": "pmatcher-workspace",
  "private": true,
  "workspaces": [
    "PMatcher",
    "GenericProcedure"
  ]
}
```

3. Install dependencies:
```bash
bun install
```

### Using as a Package

If you want to use PMatcher as a package in another project:

```bash
bun install pmatcher
```

or 

```bash
npm install pmatcher
```

## Object Matching

PMatcher supports pattern matching against plain JavaScript objects. Plain objects in patterns are auto-detected as object patterns—no special header needed.

### Match and compile

```typescript
import { match, P, isSucceed, get_dict, get_value } from 'pmatcher';

// Plain object pattern: { key: subPattern, ... }
const result = match(
  { name: "Alice", age: 30 },
  { name: [P.constant, "Alice"], age: [P.element, "age"] }
);

if (isSucceed(result)) {
  const dict = get_dict(result);
  get_value("age", dict);  // 30
}
```

### P.partial_obj (optional keys)

Use `[P.partial_obj, { ... }]` when keys are optional. At least one pattern key must match; extra fields in the input are allowed.

```typescript
import { match, P } from 'pmatcher';

match({ name: "John", city: "NYC" }, [P.partial_obj, { name: [P.constant, "John"], age: [P.constant, 30] }]);
// Success: age absent but partial_obj allows it
```

### Shorthand: with_rule, otherwise, chain_match

Combinator-style match with multiple rules and a fallback:

```typescript
import { with_rule, otherwise, match, P } from 'pmatcher';

const result = chain_match(
  { type: "user", name: "Dave" },
  [
    with_rule({ type: [P.constant, "user"], name: [P.element, "n"] }, (get) => get("n")),
    with_rule({ type: [P.constant, "admin"] }, () => "admin"),
    otherwise((input) => "unknown")
  ]
);
// result === "Dave"
```

See [docs/OBJECT_MATCHING.md](docs/OBJECT_MATCHING.md) for full API reference.

## Using MatchBuilder

The `compile` function builds matchers from pattern expressions. Use `match` for one-off matching or `run_matcher` for low-level control:

```typescript
import { compile, P, run_matcher } from 'pmatcher';

const matcher = compile(["Hello", ["John", [P.segment, "details"], "Unrelated"]]);
const data = ["Hello", ["John", "age:30", "location:NY", "Unrelated"]];

const result = run_matcher(matcher, data, (dict, nEaten) => ({ dict, nEaten }));
// result.dict has binding "details" => ["age:30", "location:NY"]
```

## Using "..." Pattern

The `"..."` pattern is used to match any remaining elements in the data array:

```typescript
import { compile, P, run_matcher } from 'pmatcher';

const matcher = compile(["start", "...", [P.element, "e"]]);
const data = ["start", 1, 2, 3, "end"];

const result = run_matcher(matcher, data, (dict, nEaten) => ({ dict, nEaten }));
// dict["e"] === "end", nEaten === 5
```

## Matching Nested Array

```typescript
import { compile, P, run_matcher } from 'pmatcher';

const matcher = compile(["start", ["subStart", [P.element, "key"], "subEnd"], "end"]);
const data = ["start", ["subStart", "actualValue", "subEnd"], "end"];

const result = run_matcher(matcher, data, (dict, nEaten) => ({ dict, nEaten }));
// dict["key"] === "actualValue", nEaten === 3
```



## Tail Recursion with match_letrec

The `match_letrec` function allows you to define recursive patterns:

```typescript
import { compile, P, run_matcher } from 'pmatcher';

const matcher = compile([P.letrec,
  [["a", [P.choose, [], ["1", [P.ref, "b"]]]],
  ["b", [P.choose, [], ["2", [P.ref, "a"]]]]],
  [P.ref, "a"]]);

const data = ["1", ["2", ["1", ["2", []]]]];
const result = run_matcher(matcher, data, (dict, nEaten) => ({ dict, nEaten }));
```


```
output:
{
  dict: MatchDict {
    dict: Map(2) {
      'a' => DictValue {
        referenced_definition: Map(1) {
          1 => [Function (anonymous)] { [length]: 4, [name]: '' }
        }
      },
      'b' => DictValue {
        referenced_definition: Map(1) {
          1 => [Function (anonymous)] { [length]: 4, [name]: '' }
        }
      }
    }
  },
  nEaten: 1
}

```

## The Power Of Lexical Scoping and Backtracking

The pattern matcher DSL is **lexically scoped**, meaning variable assignments in `match_letrec` follow lexical scoping rules. This enables powerful recursive pattern definitions with proper closure semantics. Additionally, the matcher supports **backtracking** through `P.sequence` and the underlying matching combinators, automatically exploring alternative matches when a pattern fails.

Here is an example demonstrating how to use lexical scoping and tail recursion to match complex recursive patterns such as palindrome:



```typescript
const matcher = compile([
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
    ]])


const result = run_matcher(matcher, [["a", ["b", ["c", [], "c"], "b"], "a"]], (dict, nEaten) => {
    return { dict, nEaten };
});

console.log(inspect(result, {showHidden: true, depth: 10}))
```

output:
```
{
  env: MatchDict {
    dict: Map(2) {
      'palindrome' => DictValue {
        referenced_definition: Map(1) {
          1 => [Function (anonymous)] { [length]: 4, [name]: '' }
        }
      },
      'x' => DictValue {
        referenced_definition: Map(4) { 2 => 'a', 3 => 'b', 4 => 'c', 5 => '$$$_&&&' }
      }
    }
  },
  nEaten: 1
}
```

## Backtracking with P.sequence

The pattern matcher supports backtracking through `P.sequence` and the underlying matching combinators. When a match fails, the matcher automatically backtracks to try alternative paths. This is particularly useful for ambiguous patterns where multiple matches are possible.

```typescript
// Example: Backtracking with P.choose (which uses backtracking internally)
import { compile, P, run_matcher } from 'pmatcher';

// This pattern will try each alternative in sequence, backtracking if one fails
const matcher = compile([
  P.choose,
  ["prefix", "value1"],
  ["prefix", "value2"],
  ["other", "value3"]
]);

const result1 = run_matcher(matcher, ["prefix", "value1"], (dict, nEaten) => ({ dict, nEaten }));
// Matches the first alternative

const result2 = run_matcher(matcher, ["prefix", "value2"], (dict, nEaten) => ({ dict, nEaten }));
// Backtracks from first and matches the second

const result3 = run_matcher(matcher, ["other", "value3"], (dict, nEaten) => ({ dict, nEaten }));
// Backtracks from first two and matches the third
```

The backtracking mechanism works seamlessly with lexical scoping, ensuring that variable bindings are properly managed during backtracking operations.

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

   MatchObject.ts provides `match_object` and `match_object_partial` for object patterns. Plain objects and `[P.partial_obj, {...}]` are compiled via MatchBuilder into these matchers.

3. Usage in MatchBuilder.ts:
   - `compile` function uses these building blocks and combinators to construct a matcher from a pattern expression. It interprets patterns via generic procedure handlers and combines them using `match_array`, `match_object`, or other combinators as needed.
   - `match` compiles a pattern and runs it; `run_matcher` is the low-level API that takes a matcher instance and data.

By leveraging the functions from MatchCallback.ts and MatchCombinator.ts, MatchBuilder.ts provides a flexible and powerful way to define and execute complex matching rules on data arrays.
*/
