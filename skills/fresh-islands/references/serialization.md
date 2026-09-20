# Island prop serialization — reference

What a route can pass to an island is decided by the serializer, not by TypeScript. `fresh_islands(workspace="/abs/path", name="...")` reports `props` with serializability (`yes | no | unknown`) and a reason; I002 is the finding.

## 2.x (fresh source: packages/fresh/src/jsonify/stringify.ts; Fresh docs: advanced/serialization)

| Accepted | Notes |
|---|---|
| `null`, `undefined` | |
| `boolean`, `number` (incl. `NaN`, `±Infinity`, `-0`), `bigint`, `string` | |
| arrays (sparse ok) | |
| plain objects (string keys) | |
| `Uint8Array` | |
| `URL`, `Date`, `RegExp`, `Set`, `Map` | |
| `Temporal.Instant`, `ZonedDateTime`, `PlainDate`, `PlainTime`, `PlainDateTime`, `PlainYearMonth`, `PlainMonthDay`, `Duration` | |
| Preact `Signal` | serialized via `.peek()`, revived as a new `signal()`; shared instances preserved |
| computed signals | static value |
| JSX elements, including `children: ComponentChildren` | server-rendered, passed through |
| circular references | supported |

| Rejected | Error or effect |
|---|---|
| functions and closures | `throw new Error("Serializing functions is not supported.")` |
| class instances | prototype lost |
| `Symbol` | |
| `WeakMap`, `WeakSet` | |
| streams, promises | |

## 1.x (fresh source: 1.7.3/src/server/serializer.ts; Fresh docs 1.x: islands)

| Accepted | Notes |
|---|---|
| `null`, `boolean`, `number`, `bigint`, `string` | `Infinity`, `-Infinity`, `NaN` become `null` |
| arrays, plain objects | |
| `Uint8Array` | |
| `Signal` | |
| JSX **only as `props.children`** | the VNode becomes a `null` placeholder and is restored from the rendered HTML |
| circular references | ok |

| Rejected |
|---|
| `Date` — pass an ISO string (the docs' suggestion) |
| custom classes |
| functions |
| `Map`, `Set` |
| `RegExp`, `URL` |
| JSX in any prop other than `children` |

## Patterns that keep props serializable

- A callback is wanted (`onSave`, `onChange`): do not pass it. Let the island own the handler and call an API route (`fetch("/api/like", { method: "POST" })`), or create a signal in the route and pass the signal.
- A class instance from a data layer: map it to a plain object in the handler (`{ id, title, publishedAt: post.publishedAt.toISOString() }` in 1.x; in 2.x a `Date` may stay a `Date`).
- The request, the context, a DB handle, a `Response`: never. Shape the data in the handler (`fresh-data-flow`).
- Large data: it is embedded in the HTML on every render; pass what the island needs and fetch the rest from the island.
- `undefined` prop values: fine in 2.x; in 1.x prefer `null` or omit the prop.

## How to read `fresh_islands` output

- A prop reported as not serializable, with the reason naming the type → I002, `severity: error`.
- A prop reported as `unknown` → its type is not literal (a generic, or an imported alias the parser did not resolve); `deno check` verifies the component contract, but the serializer is not type-checked, so confirm the runtime value.
- `usedBy` plus `fresh_usages(target="islands/X.tsx::X").jsxUses[].props` shows the prop names actually passed at each call site.
