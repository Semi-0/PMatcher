import type { matcher_callback } from "./MatchCallback";
import { MatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import { run_matcher, match_choose } from "./MatchCombinator";
import { emptyMatchDict } from "./MatchDict";
import { first, rest, isPair, isEmpty, isArray, isString, isMatcher } from "./utility";
import  { match_compose } from "./MatchCombinator";
//TODO: Support parsec like composable patterns 




export function match_builder(matchers: any[]): (data: any[], succeed: (dictionary: MatchDict, nEaten: number) => any) => any {
    return (data: any[], succeed: (dictionary: MatchDict, nEaten: number) => any) => {
        const loop = (rest_items: any[], registed_matchers: matcher_callback[]): matcher_callback[] => {
            if (isEmpty(rest_items)){
                return registed_matchers
            }
            
            const head_item = first(rest_items)

            if (isArray(head_item)){
            const arrayItem: matcher_callback[] = loop(head_item, [])
            const listMatcher = match_compose(arrayItem)

            return loop(rest(rest_items), [...registed_matchers, listMatcher])
            }
            else if (isString(head_item)){
                return loop(rest(rest_items), [...registed_matchers, match_constant(head_item)])
            }
            else if (isMatcher(head_item)){
                return loop(rest(rest_items), [...registed_matchers, head_item])
            }
            else {
                throw new Error(`Invalid pattern: ${head_item}, rest: ${rest_items}, registed_matchers: ${registed_matchers}`)
            }
        }

        const registed_matchers = match_compose(loop(first(matchers), []))

        return registed_matchers(data, emptyMatchDict(), succeed)
    }
}


const match_builder_test = match_builder([["a", match_element("element"), ["b", match_segment("segment")], "c"]])

const result = match_builder_test([["a", "b", ["b", "c", "d"], "c"]], (dict, nEaten) => {
    return dict
})

console.log(result)
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