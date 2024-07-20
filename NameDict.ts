
import { match_array, match_choose, match_compose, match_begin, match_letrec, match_new_var, match_reference } from "./MatchCombinator";
import type { matcher_callback } from "./MatchCallback";



export enum MatcherName {
    Constant = "match_constant",
    AllOtherElement = "match_all_other_element",
    Segment = "match_segment",
    Element = "match_element",
    Empty = "match_empty",
    SegmentIndependently = "match_segment_independently",
    Wildcard = "match_wildcard",
    Array = "match_array",
    Choose = "match_choose",
    Compose = "match_compose",
    Begin = "match_begin",
    Letrec = "match_letrec",
    NewVar = "match_new_var",
    Reference = "match_reference"
}