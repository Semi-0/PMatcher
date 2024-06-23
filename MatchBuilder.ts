import type { matcher_callback } from "./MatchCallback";
import { MatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import { run_matcher, match_choose } from "./MatchCombinator";
import { emptyMatchDict } from "./MatchDict";

//TODO: Support parsec like composable patterns 

// export class MatchBuilder{
//     private patterns: matcher_callback[] = []

//     private add(pattern: matcher_callback): MatchBuilder {
//         this.patterns.push(pattern)
//         return this
//     }

//     public setConstant(name: string): MatchBuilder {
//         return this.add(match_constant(name))
//     }

//     public setElement(name: string): MatchBuilder {
//         return this.add(match_element(name))
//     }

//     public setElementWithRestriction(name: string, restriction: (value: string) => boolean): MatchBuilder {
//         return this.add(match_element(name, restriction))
//     }

//     public setSegment(name: string, restriction: (value: string) => boolean = () => true): MatchBuilder {
//         return this.add(match_segment(name, restriction))
//     }

//     public match(data: string[],  succeed: (dictionary: MatchDict, nEaten: number) => any): any {
//         return run_matcher(this.patterns, data, emptyMatchDict(), succeed)
//     }

//     public choose(matchers: matcher_callback[]): MatchBuilder {
//         return this.add(match_choose(matchers))
//     }
// }



// const test_p: MatchBuilder = new MatchBuilder()
//     .setSegment("a", (s) => true)
//     .setConstant("c")
//     .setSegment("b", (s) => true)

// test_p.match(["a1", "a2", "a3", "c", "b1", "b2", "b3"], (dict: MatchDict, nEaten: number) => {
//     console.log(dict, nEaten)
// })