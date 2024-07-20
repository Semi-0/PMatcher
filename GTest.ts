import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { get_element, set_element, get_length, isArray } from "./GenericArray";
import { match, P, run_matcher } from "./MatchBuilder";
import { isSucceed } from "./predicates";
import { inspect } from 'util';
import { MatchResult } from "./MatchResult/MatchResult";
import { compile } from "./MatchBuilder";

class CustomArray<T> {
    constructor(private items: T[]) {}
    
    get(index: number): T {
        return this.items[index];
    }
    
    set(index: number, value: T): void {
        this.items[index] = value;
    }
    
    get length(): number {
        return this.items.length;
    }
}

// Extend generic procedures for CustomArray
define_generic_procedure_handler(get_element,
    (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
    <T>(array: CustomArray<T>, index: number): T => array.get(index)
);

define_generic_procedure_handler(set_element,
    (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
    <T>(array: CustomArray<T>, index: number, value: T): CustomArray<T> => {
        array.set(index, value);
        return array;
    }
);

define_generic_procedure_handler(get_length,
    (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
    <T>(array: CustomArray<T>): number => array.length
);

define_generic_procedure_handler(isArray,
    (obj: any): obj is CustomArray<any> => obj instanceof CustomArray,
    <T>(obj: any): obj is CustomArray<T> => obj instanceof CustomArray
);

// Helper function to create a custom array
function createCustomArray<T>(...items: T[]): CustomArray<T> {
    return new CustomArray(items);
}

// Test function
function testCustomArrayWithMatchBuilder() {
    const customArray = createCustomArray(1, 2, 3, 4, 5);

    const matcherExpr = [
        [P.element, "first"],
        [P.segment, "item"],
        [P.element, "last"]
    ];

    const result = run_matcher(compile(matcherExpr), customArray, (dict, eaten) => {return new MatchResult(dict, eaten)});

    if (isSucceed(result)) {
        console.log("Match succeeded!");
        console.log(inspect(result, {showHidden: true, depth: 10}));
        return true;
    } else {
        console.log("Match failed!");
        console.log(inspect(result));
        return false;
    }
}

// Run the test
const testResult = testCustomArrayWithMatchBuilder();
console.log("Test passed:", testResult);