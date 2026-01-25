// Core exports
export { MatchBuilder, compile, P, run_matcher, match } from './MatchBuilder';
export type { MatchDict } from './MatchDict/MatchDict';
export { get_value } from './MatchDict/DictInterface';

// Combinators
export { 
    match_constant,
    match_element,
    match_segment,
    match_wildcard,
    match_array,
    match_choose,
    match_compose,
    match_begin
} from './MatchCombinator';

// Object matching (NEW!)
export { match_object, match_object_partial } from './MatchObject';

// Predicates
export { isSucceed, isFailed, isPartialSuccess } from './Predicates';

// Types
export type { MatchResult } from './MatchResult/MatchResult';
export type { MatchFailure } from './MatchResult/MatchFailure';
export type { MatchPartialSuccess } from './MatchResult/PartialSuccess';
