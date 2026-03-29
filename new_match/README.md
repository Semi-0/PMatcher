# New match layer (`PMatcher/new_match`)

This folder holds the **Map-scoped** matcher implementation and a **parallel pattern compiler** to the legacy stack in [`MatchBuilder.ts`](../MatchBuilder.ts) + [`MatchCombinator.ts`](../MatchCombinator.ts).

## Layout

| File | Role |
|------|------|
| [`MatcherNameStore.ts`](./MatcherNameStore.ts) | `make_matcher`, `matcher` type, `get_matcher_name`, `is_registered_new_matcher` |
| [`NewMatchCombinator.ts`](./NewMatchCombinator.ts) | Combinators (same names as legacy, different runtime shape) |
| [`MatchObjectNew.ts`](./MatchObjectNew.ts) | `match_object` / `match_object_partial` over `matcher` + `MatchDict` `Map` |
| [`NewMatchBuilder.ts`](./NewMatchBuilder.ts) | `compile`, `run_matcher`, `match`, `try_match` — same DSL `P` as legacy |

[`index.ts`](./index.ts) re-exports the public API.

Legacy re-exports at repo root ([`NewMatchCombinator.ts`](../NewMatchCombinator.ts), [`MatcherNameStore.ts`](../MatcherNameStore.ts)) keep existing imports working.

## What changed vs legacy

1. **Matcher value** — A matcher is a plain **function** `(data, dict, envPointers, succeed) => result`, not `matcher_instance` (`{ name, procedure, args }`).
2. **Dictionary** — [`MatchDict`](../MatchDict/NewMatchDict.ts) is `Map<string, Map<scope, value>>`, not the `MatchDict` class + `DictValue`.
3. **Environment** — Scope stack is `number[]` (`default_match_env()` from NewMatchDict), same indices as `ScopeReference` numbers; **no** `internal_match` / `MatchEnvironment` array of refs from the old `MatchEnvironment` module at runtime (refs still come from [`new_ref()`](../MatchDict/ScopeReference.ts)).
4. **Failures** — Combinators return `createMatchFailure(...)` directly; there is **no** `failure` callback parameter.
5. **Compiler** — [`compile`](./NewMatchBuilder.ts) is a **separate** generic procedure (`"compile_new_match"`) from legacy `compile`, so handler tables do not mix. **Re-exports** `P` and pattern predicates from [`MatchBuilder.ts`](../MatchBuilder.ts) so pattern **syntax** and tag UUIDs are identical.
6. **Plain-object patterns** — Uses `is_plain_object_pattern_nm`: plain objects must **not** be registered matcher functions (`is_registered_new_matcher`), so `{ foo: ... }` does not collide with a combinator closure.
7. **`P.extract_matcher`** — **Not implemented** for the new layer; `compile` throws a clear error. Use legacy `MatchBuilder` or hand-built matchers until metadata exists (see TODO in `NewMatchCombinator.ts`).
8. **`run_matcher`** — Same calling convention as legacy: wraps input as **`[data]`** (one stream cell).

## Usage

```ts
import { compile, run_matcher, P } from "./new_match"
import { empty_match_dict } from "../MatchDict/NewMatchDict"

const m = compile([P.constant, "a"])
const r = run_matcher(m, "a", (dict, n) => ({ dict, nEaten: n }))
```

## Tests

[`test/NewMatchCombinator.test.ts`](../test/NewMatchCombinator.test.ts) exercises combinators and compares behavior to legacy `compile`/`run_matcher` where applicable.
