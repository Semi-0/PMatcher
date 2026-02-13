/**
 * Copyright © 2024–2026 semi-0
 *
 * Based on propagator and interpreter ideas originally developed by
 * Chris Hanson and Gerald Jay Sussman as part of the SDF system
 * accompanying the book "Software Design for Flexibility".
 *
 * This file is part of a substantially modified TypeScript
 * reimplementation with a different execution, scheduling,
 * and distribution model.
 *
 * Licensed under the GNU General Public License v3.0 or later.
 */

// Core exports
export { compile, P, run_matcher, match } from './MatchBuilder';
export { with_rule, otherwise, match as chain_match } from './Shorthand';
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
export { get_dict, get_eaten } from './MatchResult/MatchResult';
export type { MatchFailure } from './MatchResult/MatchFailure';
export type { MatchPartialSuccess } from './MatchResult/PartialSuccess';
