import type { matcher_callback } from "./MatchCallback";
import { MatchDict } from "./MatchDict";
import { match_eqv, match_element, match_segment } from "./MatchCallback";
import { run_matcher, match_choose } from "./MatchCombinator";
import { emptyMatchDict } from "./MatchDict";

//TODO: Support parsec like composable patterns 

export class MatchBuilder{
    private patterns: matcher_callback[] = []

    private add(pattern: matcher_callback): MatchBuilder {
        this.patterns.push(pattern
        return this
    }

    public setConstant(name: string): MatchBuilder {
        return this.add(match_eqv(name))
    }

    public setElement(name: string): MatchBuilder {
        return this.add(match_element(name))
    }

    public setElementWithRestriction(name: string, restriction: (value: string) => boolean): MatchBuilder {
        return this.add(match_element(name, restriction))
    }

    public setSegment(name: string): MatchBuilder {
        return this.add(match_segment(name))
    }

    public match(data: string[],  succeed: (dictionary: MatchDict, nEaten: number) => any): any {
        return run_matcher(this.patterns, data, emptyMatchDict(), succeed)
    }

    public choose(matchers: matcher_callback[]): MatchBuilder {
        return this.add(match_choose(matchers))
    }
}
