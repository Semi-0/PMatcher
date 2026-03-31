import { P, translate } from "../MatchBuilder"
import {
    match_dict_substitute,
    match_single_substitution,
    type UnifyDict,
} from "../new_match/Unification"

const E = (name: string): any[] => [P.element, name]
const S = (name: string): any[] => [P.segment, name]

const dictOf = (entries: Array<[string, any]>): UnifyDict => new Map(entries)
const dictToEntries = (dict: UnifyDict): Array<[string, any]> => [...dict.entries()]
const pretty = (x: any): any => (Array.isArray(x) ? translate(x) : x)

type Example = {
    name: string
    input: any
    output: any
}

/**
 * Examples for match_dict_substitute(dict)(pattern):
 * - Replaces ALL variables found in the pattern if they are bound in dict.
 * - Leaves unbound variables untouched.
 * - If a segment variable appears inside an array and maps to an array value,
 *   it gets spliced into that array.
 */
export const dictSubstituteExamples: Example[] = [
    {
        name: "element variable is replaced from dict",
        input: {
            dict: dictOf([["x", 42]]),
            pattern: E("x"),
        },
        output: 42,
    },
    {
        name: "unbound variable stays unchanged",
        input: {
            dict: dictOf([]),
            pattern: E("x"),
        },
        output: E("x"),
    },
    {
        name: "segment variable is spliced when inside an array",
        input: {
            dict: dictOf([["xs", [1, 2]]]),
            pattern: [S("xs"), 3],
        },
        output: [1, 2, 3],
    },
    {
        name: "multiple replacements happen in one pass",
        input: {
            dict: dictOf([
                ["x", "alice"],
                ["ys", ["tag1", "tag2"]],
            ]),
            pattern: ["user", E("x"), S("ys"), "end"],
        },
        output: ["user", "alice", "tag1", "tag2", "end"],
    },
]

/**
 * Examples for match_single_substitution(variable, value)(pattern):
 * - Replaces ONLY one chosen variable (matched by kind + name).
 * - Other variables remain unchanged.
 * - Segment replacement can splice if the target appears inside an array.
 */
export const singleSubstituteExamples: Example[] = [
    {
        name: "replace one element variable",
        input: {
            variable: E("x"),
            value: 99,
            pattern: ["pair", E("x"), E("y")],
        },
        output: ["pair", 99, E("y")],
    },
    {
        name: "does not replace same name with different kind",
        input: {
            variable: E("x"),
            value: 99,
            pattern: [S("x"), E("x")],
        },
        output: [S("x"), 99],
    },
    {
        name: "replace segment variable inside array (splicing)",
        input: {
            variable: S("xs"),
            value: ["a", "b"],
            pattern: [0, S("xs"), 3],
        },
        output: [0, "a", "b", 3],
    },
]

type GradualStep = {
    step: string
    pattern: any
    out: any
}

/**
 * Gradual resolution example (unresolved → partially resolved → fully resolved):
 *
 * - Step 0: pattern has unresolved variables x and y.
 * - Step 1: substitute x with y (still unresolved overall).
 * - Step 2: substitute y with 10 (now x indirectly resolves too once you re-run dict substitution).
 */
export const gradualResolutionExample = () => {
    const pattern0 = ["eq", E("x"), E("y")]

    const step1: GradualStep = {
        step: "single substitution: x := y (still unresolved)",
        pattern: pattern0,
        out: match_single_substitution(E("x"), E("y"))(pattern0),
    }

    // dict that still contains an unresolved var as a value
    const dict1 = dictOf([["x", E("y")]])
    const step2: GradualStep = {
        step: "dict substitution with x -> y (still unresolved)",
        pattern: pattern0,
        out: match_dict_substitute(dict1)(pattern0),
    }

    // later: y becomes known
    const dict2 = dictOf([
        ["x", E("y")],
        ["y", 10],
    ])
    const step3: GradualStep = {
        step: "dict substitution after adding y -> 10 (fully resolved)",
        pattern: pattern0,
        out: match_dict_substitute(dict2)(pattern0),
    }

    const sub2 = match_dict_substitute(dict2)
    const step4: GradualStep = {
        step: "apply dict substitution twice (chases x -> y -> 10)",
        pattern: pattern0,
        out: sub2(sub2(pattern0)),
    }

    return {
        pattern0,
        dict1,
        dict2,
        steps: [step1, step2, step3, step4],
    }
}

export const runSubstitutionExamples = () => ({
    match_dict_substitute: dictSubstituteExamples.map((example) => ({
        name: example.name,
        input: example.input,
        expected_output: example.output,
        actual_output: match_dict_substitute(example.input.dict)(example.input.pattern),
    })),
    match_single_substitution: singleSubstituteExamples.map((example) => ({
        name: example.name,
        input: example.input,
        expected_output: example.output,
        actual_output: match_single_substitution(
            example.input.variable,
            example.input.value
        )(example.input.pattern),
    })),
    gradual_resolution: gradualResolutionExample(),
})

export const logSubstitutionExamples_io = (): void => {
    const all = runSubstitutionExamples()
    const g = all.gradual_resolution

    const gradualCore = {
        pattern0: pretty(g.pattern0),
        dict1_entries: dictToEntries(g.dict1).map(([k, v]) => [k, pretty(v)]),
        dict2_entries: dictToEntries(g.dict2).map(([k, v]) => [k, pretty(v)]),
        steps: g.steps.map((s: any) => ({
            step: s.step,
            in: pretty(s.pattern),
            out: pretty(s.out),
        })),
    }

    console.log("=== gradual resolution core ===")
    console.log(JSON.stringify(gradualCore, null, 2))

    // console.log("\n=== full dump ===")
    // console.log(JSON.stringify(all, null, 2))
}

const isMain = (import.meta as ImportMeta & { main?: boolean }).main === true
if (isMain) {
    logSubstitutionExamples_io()
}

