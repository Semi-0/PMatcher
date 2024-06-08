# pmatcher

To install this library, run:
```bash
bun install pmatcher
```

or 

```bash
npm install pmatcher
```


# Using MatcherBuilder

The `MatcherBuilder` class allows you to build and run custom pattern matchers. Here's a basic example of how to use it:

```typescript
// Example usage of MatcherBuilder
import { MatchBuilder } from 'pmatcher/MatchBuilder';

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
