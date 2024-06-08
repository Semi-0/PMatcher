import type { matcher_callback } from "./MatchCallback";
import { MatchDict } from "./MatchDict";
import { MatchConstant, MatchElement, MatchSegment } from "./MatchItem";
import { match_eqv, match_element, match_segment } from "./MatchCallback";
import { run_matcher, match_choose } from "./MatchCombinator";
import { emptyMatchDict } from "./MatchDict";

export class MatcherBuilder{
    private patterns: matcher_callback[] = []

    private add(pattern: matcher_callback): MatcherBuilder {
        this.patterns.push(pattern)
        return this
    }

    public setConstant(name: string): MatcherBuilder {
        return this.add(match_eqv(new MatchConstant(name)))
    }

    public setElement(name: string): MatcherBuilder {
        return this.add(match_element(new MatchElement(name)))
    }

    public setElementWithRestriction(name: string, restriction: (value: string) => boolean): MatcherBuilder {
        return this.add(match_element(new MatchElement(name), restriction))
    }

    public setSegment(name: string): MatcherBuilder {
        return this.add(match_segment(new MatchSegment(name)))
    }

    public match(data: string[],  succeed: (dictionary: MatchDict, nEaten: number) => any): any {
        return run_matcher(this.patterns, data, emptyMatchDict(), succeed)
    }

    public choose(matchers: matcher_callback[]): MatcherBuilder {
        return this.add(match_choose(matchers))
    }
}
