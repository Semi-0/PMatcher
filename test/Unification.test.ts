import { describe, test, expect } from "bun:test"
import { P } from "../MatchBuilder"
import {
    unify,
    unifier,
    match_var_equal,
    is_match_var,
    get_var_name,
    match_occurs_in,
    do_substitute,
    match_dict_substitute,
    empty_dict,
    match_extend_dict,
    match_has_bindings,
    match_get_value,
} from "../new_match/Unification"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dictOf = (entries: [string, any][]): Map<string, any> =>
    new Map<string, any>(entries)

// ─── Variable helpers ─────────────────────────────────────────────────────────

describe("variable helpers", () => {
    test("get_var_name extracts name from element pattern", () => {
        expect(get_var_name([P.element, "x"])).toBe("x")
    })

    test("get_var_name extracts name from segment pattern", () => {
        expect(get_var_name([P.segment, "xs"])).toBe("xs")
    })

    test("is_match_var recognises element variables", () => {
        expect(is_match_var([P.element, "x"])).toBe(true)
    })

    test("is_match_var recognises segment variables", () => {
        expect(is_match_var([P.segment, "xs"])).toBe(true)
    })

    test("is_match_var rejects constants", () => {
        expect(is_match_var(42)).toBe(false)
        expect(is_match_var("hello")).toBe(false)
    })

    test("is_match_var rejects plain arrays", () => {
        expect(is_match_var([1, 2, 3])).toBe(false)
    })

    test("match_var_equal: same element vars are equal", () => {
        expect(match_var_equal([P.element, "x"], [P.element, "x"])).toBe(true)
    })

    test("match_var_equal: different names are not equal", () => {
        expect(match_var_equal([P.element, "x"], [P.element, "y"])).toBe(false)
    })

    test("match_var_equal: different types are not equal", () => {
        expect(match_var_equal([P.element, "x"], [P.segment, "x"])).toBe(false)
    })

    test("match_var_equal: rejects non-arrays", () => {
        expect(match_var_equal(42, [P.element, "x"])).toBe(false)
    })
})

// ─── Occurs check ─────────────────────────────────────────────────────────────

describe("match_occurs_in", () => {
    test("variable occurs in itself", () => {
        expect(match_occurs_in([P.element, "x"], [P.element, "x"])).toBe(true)
    })

    test("variable does not occur in a different variable", () => {
        expect(match_occurs_in([P.element, "x"], [P.element, "y"])).toBe(false)
    })

    test("variable occurs inside a nested list", () => {
        expect(match_occurs_in([P.element, "x"], [1, [2, [P.element, "x"]]])).toBe(true)
    })

    test("variable does not occur in an unrelated list", () => {
        expect(match_occurs_in([P.element, "x"], [1, 2, 3])).toBe(false)
    })

    test("variable does not occur in a constant", () => {
        expect(match_occurs_in([P.element, "x"], 42)).toBe(false)
    })
})

// ─── do_substitute ────────────────────────────────────────────────────────────

describe("do_substitute", () => {
    test("binds variable to constant in empty dict", () => {
        const result = do_substitute([P.element, "x"], 42, empty_dict())
        expect(result).not.toBe(false)
        expect((result as Map<string, any>).get("x")).toBe(42)
    })

    test("fails when occurs check is violated", () => {
        // x → [x] would be circular
        expect(do_substitute([P.element, "x"], [[P.element, "x"]], empty_dict())).toBe(false)
    })

    test("fails when restriction is not satisfied", () => {
        const numOnly = [P.element, "x", (v: any) => typeof v === "number"]
        expect(do_substitute(numOnly, "hello", empty_dict())).toBe(false)
    })

    test("passes when restriction is satisfied", () => {
        const numOnly = [P.element, "x", (v: any) => typeof v === "number"]
        const result = do_substitute(numOnly, 99, empty_dict())
        expect(result).not.toBe(false)
        expect((result as Map<string, any>).get("x")).toBe(99)
    })

    test("applies existing dict before binding", () => {
        // dict: y → 10; binding x to (? y) should resolve x → 10
        const dict = dictOf([["y", 10]])
        const result = do_substitute([P.element, "x"], [P.element, "y"], dict)
        expect(result).not.toBe(false)
        expect((result as Map<string, any>).get("x")).toBe(10)
    })
})

// ─── dict utilities ───────────────────────────────────────────────────────────

describe("dict utilities", () => {
    test("match_extend_dict adds a binding by name", () => {
        const d = match_extend_dict([P.element, "x"], 7, empty_dict())
        expect(d.get("x")).toBe(7)
    })

    test("match_has_bindings detects bound variable", () => {
        const d = dictOf([["x", 99]])
        expect(match_has_bindings([P.element, "x"], d)).toBe(true)
        expect(match_has_bindings([P.element, "y"], d)).toBe(false)
    })

    test("match_get_value retrieves bound value", () => {
        const d = dictOf([["x", "hello"]])
        expect(match_get_value([P.element, "x"], d)).toBe("hello")
    })

    test("match_dict_substitute replaces element var with its value", () => {
        const d = dictOf([["x", 42]])
        expect(match_dict_substitute(d)([P.element, "x"])).toBe(42)
    })

    test("match_dict_substitute leaves unbound vars unchanged", () => {
        const d = empty_dict()
        const pat = [P.element, "x"]
        expect(match_dict_substitute(d)(pat)).toEqual(pat)
    })

    test("match_dict_substitute splices segment var inside array", () => {
        const d = dictOf([["xs", [1, 2]]])
        const pat = [[P.segment, "xs"], 3]
        expect(match_dict_substitute(d)(pat)).toEqual([1, 2, 3])
    })
})

// ─── Constant unification ─────────────────────────────────────────────────────

describe("unify — constants", () => {
    test("equal numbers", () => {
        const result = unify(1, 1)
        expect(result).not.toBe(false)
        expect((result as Map<string, any>).size).toBe(0)
    })

    test("equal strings", () => {
        expect(unify("abc", "abc")).not.toBe(false)
    })

    test("unequal numbers", () => {
        expect(unify(1, 2)).toBe(false)
    })

    test("unequal strings", () => {
        expect(unify("a", "b")).toBe(false)
    })

    test("number vs string", () => {
        expect(unify(1, "1")).toBe(false)
    })
})

// ─── Element variable unification ─────────────────────────────────────────────

describe("unify — element variables", () => {
    test("element var binds to a constant (var on left)", () => {
        const result = unify([P.element, "x"], 42)
        expect((result as Map<string, any>).get("x")).toBe(42)
    })

    test("element var binds to a constant (var on right)", () => {
        const result = unify(42, [P.element, "x"])
        expect((result as Map<string, any>).get("x")).toBe(42)
    })

    test("same element var on both sides succeeds with empty dict", () => {
        const result = unify([P.element, "x"], [P.element, "x"])
        expect(result).not.toBe(false)
    })

    test("different element vars: one is bound to the other", () => {
        const result = unify([P.element, "x"], [P.element, "y"])
        expect(result).not.toBe(false)
        const d = result as Map<string, any>
        // Unification may bind x→y or y→x depending on dispatch order; either is valid
        const xBound = d.has("x") && match_var_equal(d.get("x"), [P.element, "y"])
        const yBound = d.has("y") && match_var_equal(d.get("y"), [P.element, "x"])
        expect(xBound || yBound).toBe(true)
    })

    test("consistency: once x=1, x must equal 1 again", () => {
        // [1, (? x)] unified with [1, 1] should give x=1
        const result = unify([1, [P.element, "x"]], [1, 1])
        expect((result as Map<string, any>).get("x")).toBe(1)
    })

    test("inconsistency: once x=1, x≠2 fails", () => {
        const result = unify([1, [P.element, "x"], [P.element, "x"]], [1, 1, 2])
        expect(result).toBe(false)
    })

    test("occurs check prevents circular binding", () => {
        // x cannot be bound to a list containing x
        expect(unify([P.element, "x"], [[P.element, "x"]])).toBe(false)
    })

    test("restriction passes", () => {
        const result = unify([P.element, "x", (v: any) => typeof v === "number"], 7)
        expect((result as Map<string, any>).get("x")).toBe(7)
    })

    test("restriction fails", () => {
        expect(
            unify([P.element, "x", (v: any) => typeof v === "number"], "hello")
        ).toBe(false)
    })
})

// ─── List unification ─────────────────────────────────────────────────────────

describe("unify — lists", () => {
    test("equal concrete lists", () => {
        expect(unify([1, 2, 3], [1, 2, 3])).not.toBe(false)
    })

    test("list with element var binds correctly", () => {
        const result = unify([1, [P.element, "x"]], [1, 2])
        expect((result as Map<string, any>).get("x")).toBe(2)
    })

    test("nested list unification", () => {
        const result = unify([1, [2, [P.element, "x"]]], [1, [2, 3]])
        expect((result as Map<string, any>).get("x")).toBe(3)
    })

    test("two vars in a list", () => {
        const result = unify([[P.element, "a"], [P.element, "b"]], [10, 20])
        const d = result as Map<string, any>
        expect(d.get("a")).toBe(10)
        expect(d.get("b")).toBe(20)
    })

    test("mismatched list lengths fail", () => {
        expect(unify([1, 2], [1, 2, 3])).toBe(false)
    })

    test("mismatched constant inside list fails", () => {
        expect(unify([1, 9], [1, 2])).toBe(false)
    })
})

// ─── Segment variable unification ─────────────────────────────────────────────

describe("unify — segment variables", () => {
    test("segment var binds to empty list", () => {
        const result = unify([[P.segment, "xs"]], [])
        expect((result as Map<string, any>).get("xs")).toEqual([])
    })

    test("segment var binds to single-element list", () => {
        const result = unify([[P.segment, "xs"]], [1])
        expect((result as Map<string, any>).get("xs")).toEqual([1])
    })

    test("segment var binds to multi-element list", () => {
        const result = unify([[P.segment, "xs"]], [1, 2, 3])
        expect((result as Map<string, any>).get("xs")).toEqual([1, 2, 3])
    })

    test("segment var at start, constant at end", () => {
        const result = unify([[P.segment, "xs"], 3], [1, 2, 3])
        expect((result as Map<string, any>).get("xs")).toEqual([1, 2])
    })

    test("constant at start, segment var at end", () => {
        const result = unify([1, [P.segment, "xs"]], [1, 2, 3])
        expect((result as Map<string, any>).get("xs")).toEqual([2, 3])
    })

    test("segment var in the middle", () => {
        const result = unify([1, [P.segment, "xs"], 4], [1, 2, 3, 4])
        expect((result as Map<string, any>).get("xs")).toEqual([2, 3])
    })

    test("two segment vars cover the whole list", () => {
        const result = unify([[P.segment, "xs"], [P.segment, "ys"]], [1, 2, 3])
        expect(result).not.toBe(false)
        const d = result as Map<string, any>
        const xs: any[] = d.get("xs") ?? []
        const ys: any[] = d.get("ys") ?? []
        expect([...xs, ...ys]).toEqual([1, 2, 3])
    })

    test("same segment var on both sides succeeds", () => {
        const result = unify([[P.segment, "xs"]], [[P.segment, "xs"]])
        expect(result).not.toBe(false)
    })

    test("segment var inside a list pattern", () => {
        // Unifying list patterns containing segment vars
        const result = unify(
            [[P.segment, "xs"], [P.element, "y"]],
            [10, 20, 30]
        )
        expect(result).not.toBe(false)
        const d = result as Map<string, any>
        const xs: any[] = d.get("xs") ?? []
        const y = d.get("y")
        expect([...xs, y]).toEqual([10, 20, 30])
    })
})

// ─── unifier ──────────────────────────────────────────────────────────────────

describe("unifier", () => {
    test("returns substituted constant", () => {
        expect(unifier([P.element, "x"], 42)).toBe(42)
    })

    test("returns substituted list pattern", () => {
        expect(unifier([1, [P.element, "x"]], [1, 2])).toEqual([1, 2])
    })

    test("returns false on unification failure", () => {
        expect(unifier(1, 2)).toBe(false)
    })

    test("returns fully substituted list with multiple vars", () => {
        expect(
            unifier([[P.element, "a"], [P.element, "b"]], [10, 20])
        ).toEqual([10, 20])
    })

    test("segment var substitution splices into result", () => {
        const result = unifier([[P.segment, "xs"], 4], [1, 2, 3, 4])
        expect(result).toEqual([1, 2, 3, 4])
    })

    test("unifier is symmetric for element vars", () => {
        // unifier(pattern1, pattern2) applies the dict to pattern1
        const dict = unify([P.element, "x"], 99) as Map<string, any>
        expect(dict.get("x")).toBe(99)
        // applying to the constant side gives back the constant
        expect(unifier(99, [P.element, "x"])).toBe(99)
    })
})
