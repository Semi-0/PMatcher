# pmatcher

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# Using MatcherBuilder

The `MatcherBuilder` class allows you to build and run custom pattern matchers. Here's a basic example of how to use it:

```typescript
// Example usage of MatcherBuilder
import { MatcherBuilder } from './MatchBuilder';

// Create a new instance of MatcherBuilder
let matcher = new MatcherBuilder();

// Define patterns using the builder methods
matcher.setConstant("Hello")
      .setElement("name")
      .setSegment("details");

// Example data array
const data = ["Hello", "John", "age:30", "location:NY"];

// Define a success callback
function onSuccess(matchDict, nEaten) {
    console.log(`Matched Dictionary:`, matchDict);
    console.log(`Number of elements processed:`, nEaten);
}

// Run the matcher on the data
matcher.match(data, onSuccess);
