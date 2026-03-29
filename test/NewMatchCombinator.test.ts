import { test, expect, describe, beforeEach, mock } from "bun:test"
import { compile, P, run_matcher } from "../MatchBuilder"
import { compile as compileNew, run_matcher as runMatcherNew, P as PNew } from "../new_match"
import { empty_match_dict, default_match_env, lookup_scoped } from "../MatchDict/NewMatchDict"
import { clearRefHistory } from "../MatchDict/ScopeReference"
import { FailedReason, MatchFailure } from "../MatchResult/MatchFailure"
import { isFailed, isPartialSuccess, isSucceed } from "../Predicates"
import { MatcherName } from "../NameDict"
import {
    match_all_other_element,
    match_array,
    match_begin,
    match_choose,
    match_compose,
    match_constant,
    match_element,
    match_empty,
    match_letrec,
    match_map,
    match_new_var,
    match_reference,
    match_segment,
    match_segment_independently,
    match_transform,
    match_wildcard,
    match_with,
} from "../NewMatchCombinator"
import type { matcher } from "../MatcherNameStore"
import type { MatchDict } from "../MatchDict/NewMatchDict"
import { get_matcher_name } from "../MatcherNameStore"
import { is_match_partial_success } from "../MatchResult/PartialSuccess"

/** MatchBuilder.run_matcher passes `internal_match(m, [data], …)` — one stream cell is the whole row. */
const succeedRecord = (dict: any, nEaten: number) => ({ dict, nEaten })

function runWrapped(m: matcher, data: any[], succeed = succeedRecord) {
    return m([data], empty_match_dict(), default_match_env(), succeed)
}

/** Flat token stream (no extra MatchBuilder wrap). */
function runFlat(m: matcher, data: any[], dict: MatchDict = empty_match_dict(), env: number[] = default_match_env()) {
    return m(data, dict, env, succeedRecord)
}

function nEatenOf(r: unknown): number | undefined {
    if (isFailed(r)) return undefined
    if (r && typeof r === "object" && "nEaten" in r) return (r as { nEaten: number }).nEaten
    return undefined
}

function assertSameOutcome(oldR: unknown, newR: unknown) {
    expect(isFailed(oldR)).toBe(isFailed(newR))
    expect(isSucceed(oldR)).toBe(isSucceed(newR))
    if (!isFailed(oldR)) {
        expect(nEatenOf(oldR)).toBe(nEatenOf(newR))
    }
}

describe("NewMatchCombinator", () => {
    beforeEach(() => {
        clearRefHistory()
    })

    test("new_match compile + run_matcher tracks legacy for constant pattern", () => {
        const data = ["a"]
        const s = mock(succeedRecord)
        const oldR = run_matcher(compile(["a"]), data, s)
        const newR = runMatcherNew(compileNew(["a"]), data, s)
        assertSameOutcome(oldR, newR)
        expect(PNew.constant).toBe(P.constant)
    })

    describe("parity with MatchBuilder (wrapped stream)", () => {
        test("constant via match_array single cell mirrors compile([a])", () => {
            const data = ["a"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(compile(["a"]), data, s)
            const newR = runWrapped(match_array([match_constant("a")]), data, s)
            assertSameOutcome(oldR, newR)
        })

        test("element mirrors compile([P.element, x])", () => {
            const data = ["value"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(compile([P.element, "x"]), data, s)
            const newR = runWrapped(match_array([match_element("x")]), data, s)
            assertSameOutcome(oldR, newR)
        })

        test("segment + end mirrors compile segment pattern", () => {
            const data = ["seg1", "seg2", "end"]
            const s = mock(succeedRecord)
            const oldPattern = [[P.segment, "seg"], "end"]
            const oldR = run_matcher(compile(oldPattern), data, s)
            const newR = runWrapped(match_array([match_segment("seg"), match_constant("end")]), data, s)
            assertSameOutcome(oldR, newR)
        })

        test("letrec + ref mirrors compile letrec", () => {
            const data = ["b"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(compile([P.letrec, [["a", [P.constant, "b"]]], [[P.ref, "a"]]]), data, s)
            const newR = runWrapped(
                match_letrec(
                    [{ key: "a", value: match_constant("b") }],
                    match_array([match_reference("a")])
                ),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
        })

        test("choose mirrors compile choose", () => {
            const data = ["a"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(compile([P.choose, [[P.constant, "a"]], [[P.constant, "b"]]]), data, s)
            const newR = runWrapped(
                match_choose([match_array([match_constant("a")]), match_array([match_constant("b")])]),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
        })

        test("nested letrec + choose mirrors compile", () => {
            const data = ["b"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(
                compile([
                    P.letrec,
                    [["a", [P.constant, "b"]]],
                    [P.choose, [[P.ref, "a"]], [P.constant, "c"]],
                ]),
                data,
                s
            )
            const newR = runWrapped(
                match_letrec(
                    [{ key: "a", value: match_constant("b") }],
                    match_choose([match_array([match_reference("a")]), match_constant("c")])
                ),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
        })

        test("constant mismatch mirrors compile failure", () => {
            const data = ["b"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(compile([P.constant, "a"], "MEXPR_TO_MATCHER"), data, s)
            const newR = runWrapped(match_constant("a"), data, s)
            expect(oldR).toEqual(expect.objectContaining({ matcher: MatcherName.Constant, reason: FailedReason.UnexpectedInput }))
            expect(newR).toEqual(expect.objectContaining({ matcher: MatcherName.Constant, reason: FailedReason.UnexpectedInput }))
            expect(s).not.toHaveBeenCalled()
        })

        test("letrec choose ref mutual mirrors compile", () => {
            const data = ["1", ["2", ["1", ["2", []]]]]
            const s = mock(succeedRecord)
            const oldPattern = [
                P.letrec,
                [
                    ["a", [P.choose, [], ["1", [P.ref, "b"]]]],
                    ["b", [P.choose, [], ["2", [P.ref, "a"]]]],
                ],
                [P.ref, "a"],
            ]
            const oldR = run_matcher(compile(oldPattern, "MEXPR_TO_MATCHER"), data, s)
            const newR = runWrapped(
                match_letrec(
                    [
                        {
                            key: "a",
                            value: match_choose([
                                match_array([]),
                                match_array([match_constant("1"), match_reference("b")]),
                            ]),
                        },
                        {
                            key: "b",
                            value: match_choose([
                                match_array([]),
                                match_array([match_constant("2"), match_reference("a")]),
                            ]),
                        },
                    ],
                    match_reference("a")
                ),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
        })

        test("wildcard mirrors compile(P.wildcard)", () => {
            const data = ["anything"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(compile([P.wildcard], "MEXPR_TO_MATCHER"), data, s)
            const newR = runWrapped(match_wildcard(), data, s)
            assertSameOutcome(oldR, newR)
        })

        test("repeat letrec mirrors compile", () => {
            const data = ["a", "b", "a", "d"]
            const s = mock(succeedRecord)
            const oldPattern = [
                P.letrec,
                [
                    [
                        "repeat",
                        [
                            P.new,
                            ["x"],
                            [
                                P.choose,
                                P.empty,
                                [P.compose, [P.constant, "a"], [P.element, "x"], [P.ref, "repeat"]],
                            ],
                        ],
                    ],
                ],
                [[P.ref, "repeat"]],
            ]
            const oldR = run_matcher(compile(oldPattern, "MEXPR_TO_MATCHER"), data, s)
            const newR = runWrapped(
                match_letrec(
                    [
                        {
                            key: "repeat",
                            value: match_new_var(
                                ["x"],
                                match_choose([
                                    match_empty(),
                                    match_compose([
                                        match_constant("a"),
                                        match_element("x"),
                                        match_reference("repeat"),
                                    ]),
                                ])
                            ),
                        },
                    ],
                    match_array([match_reference("repeat")])
                ),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
        })

        /** Same shape as `Matcher.test` “run_matcher with palindrome pattern”. */
        test("palindrome letrec via compile + run_matcher", () => {
            const palindromePattern = [
                [
                    P.letrec,
                    [
                        [
                            "palindrome",
                            [
                                P.new,
                                ["x"],
                                [
                                    P.choose,
                                    [],
                                    [[P.element, "x"], [P.ref, "palindrome"], [P.element, "x"]],
                                ],
                            ],
                        ],
                    ],
                    [P.ref, "palindrome"],
                ],
            ]
            const data = [["a", ["b", ["c", [], "c"], "b"], "a"]]
            const oldR = run_matcher(compile(palindromePattern, "MEXPR_TO_MATCHER"), data, (dict, _n) => dict)
            const newR = runMatcherNew(compileNew(palindromePattern, "MEXPR_TO_MATCHER"), data, (dict, _n) => dict)
            expect(isSucceed(oldR)).toBe(true)
            expect(isSucceed(newR)).toBe(true)
        })
    })

    describe("match_begin vs compile(P.begin, …)", () => {
        test("all matchers succeed", () => {
            const data = ["a", 42, "b"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(
                compile([P.begin, ["a", P.wildcard, P.wildcard], ["a", [P.element, "x"], "b"]]),
                data,
                s
            )
            const newR = runWrapped(
                match_begin([
                    match_array([match_constant("a"), match_wildcard(), match_wildcard()]),
                    match_array([match_constant("a"), match_element("x"), match_constant("b")]),
                ]),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
            expect(isSucceed(newR)).toBe(true)
        })

        test("partial success", () => {
            const data = ["a", 42, "b"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(
                compile([P.begin, ["a", P.wildcard, P.wildcard], ["a", [P.element, "x"], "c"]]),
                data,
                s
            )
            const newR = runWrapped(
                match_begin([
                    match_array([match_constant("a"), match_wildcard(), match_wildcard()]),
                    match_array([match_constant("a"), match_element("x"), match_constant("c")]),
                ]),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
            expect(isPartialSuccess(oldR)).toBe(true)
            expect(isPartialSuccess(newR)).toBe(true)
            const names = (newR as { succeedMatchers: matcher[] }).succeedMatchers.map((m) => get_matcher_name(m))
            expect(names).toEqual([MatcherName.Array])
            expect((newR as { succeedCount: number }).succeedCount).toBe(1)
        })

        test("all matchers fail", () => {
            const data = ["a", "b", "c"]
            const s = mock(succeedRecord)
            const oldR = run_matcher(compile([P.begin, "x", "y", "z"]), data, s)
            const newR = runWrapped(
                match_begin([match_constant("x"), match_constant("y"), match_constant("z")]),
                data,
                s
            )
            assertSameOutcome(oldR, newR)
            expect(isFailed(newR)).toBe(true)
            expect((newR as MatchFailure).reason).toBe(FailedReason.NonOfTheMatcherSucceed)
        })
    })

    describe("flat-stream combinators", () => {
        test("match_constant", () => {
            const m = match_constant("a")
            expect(runFlat(m, ["a"])).toEqual({ dict: empty_match_dict(), nEaten: 1 })
            const bad = runFlat(m, ["b"])
            expect(isFailed(bad)).toBe(true)
            expect((bad as MatchFailure).matcher).toBe(MatcherName.Constant)
        })

        test("match_element binds in current scope", () => {
            const m = match_element("x")
            const dict = empty_match_dict()
            const env = default_match_env()
            const r = runFlat(m, ["v"], dict, env)
            expect((r as { nEaten: number }).nEaten).toBe(1)
            expect(lookup_scoped((r as { dict: MatchDict }).dict, "x", env)).toBe("v")
        })

        test("match_segment inside compose", () => {
            const m = match_compose([match_segment("seg"), match_constant("end")])
            const r = runFlat(m, ["a", "b", "end"])
            expect((r as { nEaten: number }).nEaten).toBe(3)
            expect(lookup_scoped((r as { dict: MatchDict }).dict, "seg", default_match_env())).toEqual(["a", "b"])
        })

        test("match_compose consumes sequence", () => {
            const m = match_compose([match_constant("a"), match_constant("b")])
            expect(runFlat(m, ["a", "b"])).toEqual({ dict: empty_match_dict(), nEaten: 2 })
        })

        test("match_array first row", () => {
            const m = match_array([match_constant("x"), match_constant("y")])
            const r = runFlat(m, [["x", "y"], "tail"])
            expect((r as { nEaten: number }).nEaten).toBe(1)
        })

        test("match_choose", () => {
            const m = match_choose([match_constant("b"), match_constant("a")])
            expect(runFlat(m, ["a"])).toEqual({ dict: empty_match_dict(), nEaten: 1 })
        })

        test("match_letrec and match_reference", () => {
            const m = match_letrec([{ key: "a", value: match_constant("b") }], match_reference("a"))
            const r = runFlat(m, ["b"])
            expect((r as { nEaten: number }).nEaten).toBe(1)
        })

        test("match_new_var + element", () => {
            const m = match_new_var(["x"], match_element("x"))
            const r = runFlat(m, ["hello"])
            const scoped = (r as { dict: MatchDict }).dict.get("x") as Map<number, unknown> | undefined
            expect(scoped && [...scoped.values()].includes("hello")).toBe(true)
        })

        test("match_map", () => {
            const m = match_map(match_segment("s"), match_constant("a"))
            const r = runFlat(m, ["a", "b"])
            expect((r as { nEaten: number }).nEaten).toBe(1)
            expect(lookup_scoped((r as { dict: MatchDict }).dict, "s", default_match_env())).toEqual(["a"])
        })

        test("match_transform", () => {
            const m = match_transform((x: any) => String(Number(x) + 1), match_constant("2"))
            expect((runFlat(m, [1]) as { nEaten: number }).nEaten).toBe(1)
        })

        test("match_with", () => {
            const dict = empty_match_dict()
            const env = default_match_env()
            const d1 = runFlat(match_element("v"), ["hello"], dict, env)
            const m = match_with("v", match_constant("hello"))
            const r = runFlat(m, ["ignored"], (d1 as { dict: MatchDict }).dict, env)
            expect((r as { nEaten: number }).nEaten).toBe(1)
        })

        test("match_empty", () => {
            expect(runFlat(match_empty(), [])).toEqual({ dict: empty_match_dict(), nEaten: 0 })
            expect(isFailed(runFlat(match_empty(), [1]))).toBe(true)
        })

        test("match_all_other_element first branch", () => {
            expect((runFlat(match_all_other_element(), ["a", "b"]) as { nEaten: number }).nEaten).toBe(1)
        })

        test("match_segment_independently", () => {
            expect((runFlat(match_segment_independently("s"), ["a", "b"]) as { nEaten: number }).nEaten).toBe(2)
            expect(isFailed(runFlat(match_segment_independently("s", () => false), ["a"]))).toBe(true)
        })

        test("match_begin flat (smoke)", () => {
            const r = runFlat(match_begin([match_constant("a"), match_wildcard()]), ["a", "b"])
            expect((r as { nEaten: number }).nEaten).toBe(1)
        })

        test("match_begin partial flat", () => {
            const r = runFlat(match_begin([match_constant("a"), match_constant("z")]), ["a", "b"])
            expect(is_match_partial_success(r)).toBe(true)
        })
    })
})
