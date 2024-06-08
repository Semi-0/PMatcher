import { MatchBuilder } from './MatchBuilder';
import type { MatchDict } from './MatchDict';

// Create an instance of MatcherBuilder
const matcher = new MatchBuilder();

// Setup the matcher with some patterns
matcher.setConstant('Hello')
       .setElement('name')
       .setSegment('details');

// Example data array to match against
const data = ['Hello', 'John', 'Doe', 'age', '30'];

// Define a success callback function
const onSuccess = (matchDict: MatchDict, nEaten: number) => {
    console.log(`Matched: ${nEaten} elements`);
    console.log('Match Dictionary:', matchDict);
};

// Execute the matcher
matcher.match(data, onSuccess);

console.log("Matcher setup and run from index.ts using Bun!");
