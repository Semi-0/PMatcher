# Object Matching in PMatcher

PMatcher now supports pattern matching against JavaScript objects! This extends the existing array-based pattern matching to work seamlessly with object structures.

## Installation

```bash
bun install pmatcher
```

## Basic Usage

### Simple Object Matching

Match objects with specific constant values:

```typescript
import { match_object, match_constant, run_matcher } from 'pmatcher';

const matcher = match_object({
    name: match_constant("Alice"),
    age: match_constant(30)
});

const data = { name: "Alice", age: 30 };
const result = run_matcher(matcher, data, (dict, n) => ({ dict, n }));
// Success!
```

### Extracting Values

Use `match_element` to capture and extract values from objects:

```typescript
import { match_object, match_element, run_matcher, get_value } from 'pmatcher';

const matcher = match_object({
    name: match_element("userName"),
    email: match_element("userEmail")
});

const user = { name: "Bob", email: "bob@example.com" };
const result = run_matcher(matcher, user, (dict) => dict);

if (isSucceed(result)) {
    console.log(get_value("userName", result)); // "Bob"
    console.log(get_value("userEmail", result)); // "bob@example.com"
}
```

### Nested Objects

Match deeply nested structures:

```typescript
const matcher = match_object({
    user: match_object({
        name: match_element("name"),
        address: match_object({
            city: match_element("city"),
            country: match_constant("USA")
        })
    })
});

const data = {
    user: {
        name: "Charlie",
        address: {
            city: "New York",
            country: "USA"
        }
    }
};
```

## Partial Matching

Use `match_object_partial` when you want to match only some keys:

```typescript
import { match_object_partial } from 'pmatcher';

const matcher = match_object_partial({
    name: match_element("name"),
    email: match_element("email"),
    phone: match_element("phone")
});

// This succeeds even though 'phone' is missing
const user = { name: "David", email: "david@example.com" };
const result = run_matcher(matcher, user, (dict) => dict);
```

## Advanced Patterns

### Wildcards

Use `match_wildcard()` for fields you don't care about:

```typescript
const matcher = match_object({
    type: match_constant("user"),
    id: match_wildcard(), // Accepts any value
    name: match_element("name")
});
```

### Alternatives with `match_choose`

Match against multiple possible values:

```typescript
const matcher = match_object({
    status: match_choose([
        match_constant("active"),
        match_constant("pending"),
        match_constant("inactive")
    ]),
    userId: match_element("id")
});
```

### Combining Array and Object Matching

You can mix array and object patterns:

```typescript
import { match_array, match_object, match_element } from 'pmatcher';

// Match an array of objects
const matcher = match_array([
    match_object({
        id: match_element("id1"),
        name: match_element("name1")
    }),
    match_object({
        id: match_element("id2"),
        name: match_element("name2")
    })
]);

const data = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
];
```

## API Reference

### `match_object(pattern_obj)`

Creates a matcher that requires all keys in the pattern to exist in the data object.

- **Parameters:**
  - `pattern_obj`: An object where keys are property names and values are matchers
- **Returns:** A matcher instance
- **Behavior:** 
  - All pattern keys must exist in the data
  - Extra keys in data are allowed
  - Values must match their corresponding matchers

### `match_object_partial(pattern_obj)`

Creates a matcher that only checks keys that exist in both pattern and data.

- **Parameters:**
  - `pattern_obj`: An object where keys are property names and values are matchers
- **Returns:** A matcher instance
- **Behavior:**
  - Only checks keys that exist in the data
  - Missing keys are ignored
  - Present keys must match their matchers

## Type Safety

Both functions work with TypeScript and provide full type inference:

```typescript
interface User {
    name: string;
    age: number;
    email?: string;
}

const matcher = match_object({
    name: match_element("userName"),
    age: match_element("userAge")
});

// TypeScript knows the structure
```

## Examples

See `examples/object_matching_example.ts` for comprehensive examples including:
- Simple object matching
- Value extraction
- Nested objects
- Partial matching
- Wildcards
- Alternatives with choose

## Running Examples

```bash
bun run examples/object_matching_example.ts
```

## Running Tests

```bash
bun test test/object_matcher.test.ts
```

## Comparison with Array Matching

| Feature | Array Matching | Object Matching |
|---------|---------------|-----------------|
| Ordered | Yes | No (order doesn't matter) |
| Partial matching | Via segments | Via `match_object_partial` |
| Nesting | Arrays in arrays | Objects in objects |
| Key-based access | No | Yes |

## Why Object Matching?

Object matching extends PMatcher's capabilities to handle:
- **Configuration objects**: Match against structured config
- **API responses**: Pattern match JSON responses
- **Data validation**: Validate object shapes
- **Type checking**: Runtime type validation with patterns
- **Data extraction**: Pull specific fields from complex objects

## Integration with Existing PMatcher

Object matching uses the same infrastructure as array matching:
- Same `MatchDict` for bindings
- Same `get_value` for extraction
- Same combinator composition
- Same success/failure handling

This means you can seamlessly mix object and array patterns in your matching logic!

