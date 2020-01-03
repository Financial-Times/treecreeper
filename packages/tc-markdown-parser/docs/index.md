# runbook.md

**runbook.md** takes a runbook written in markdown
([example here](./example-runbook.md)), and converts it to JSON compatible with a Biz
Ops System record, which powers the [runbooks app](https://runbooks.in.ft.com).

the data is defined in `key`/`value` pairs where an `h2`'s value is coerced to
the `key`, and the content between the `h2` and the next `h2` (or end-of-file)
is the `value`.

it does this job by converting the markdown file to a
[markdown AST](https://github.com/syntax-tree/mdast/blob/master/readme.md) and
running some validation on it before converting it to a interstitial
[biz-ops AST](./boast.md) which can be further validated.
The property key is coerced from the `h2` value by ～＊magic＊～.

the `h1` in the file becomes the `name` property, and anything between that and
the first `h2` is the `description` property.

the biz-ops AST supports subdocuments, which are markdown ASTs. On conversion,
any headings in the content are reduced by 2 levels (on account of the `h2` that
delimits the section). The content between the `h2` and the next `h2` or
`end-of-file` is nested as the children of the property.

once the property keys have been resolved (by ～＊magic＊～), the `type` of the
property value is known, and the content can be coerced to that type by way of
_simple functions_. First, it is validated to ensure the content is convertible
to that type. Second, it's coerced (if necessary) to those types.

## unified

[Unified](https://unified.js.org) is a collection of syntax tree definitions,
and tools for processing them. Amongst its definitions is
[unist](https://github.com/syntax-tree/unist), a minimal specification for
syntax trees. If a syntax tree implements `unist`, then you get a lot of
utilities for free that you'd normally have to write for every kind of tree.
Other definitions in the collection, each of which implements `unist`, are:

-   [mdast](https://github.com/syntax-tree/mdast) — for markdown
-   [nlcst](https://github.com/syntax-tree/nlcst) — for prose
-   [hast](https://github.com/syntax-tree/hast) — for html

[remark](https://github.com/remarkjs/remark) is a highly extensible markdown
parser & stringifier. It's very cool and powerful. It parses markdown files to
`mdast` trees.

## runbook flow

the `runbook.md` flow looks like this:

1. parse to `mdast` (using `remark-parse`)
2. convert to [boast](./boast.md) – an AST for biz-ops systems
3. resolve section titles to biz-ops System property names
4. coerce the value to the property's type
5. validate with
   [biz-ops-schema](https://github.com/financial-times/biz-ops-schema)
6. Stringify to JSON

## boast

`boast` is the syntax tree for a biz-ops system, it's specified in
[boast.md](./boast.md) in this repo. It implements `unist` and adds the
following nodes:

-   `subdocument` — a node with an `mdast` tree as its child
-   `name` — a representation of the biz-ops name field
-   `description` — a representation of the biz-ops description field
-   `property` — an arbitrary biz-ops field, with a key and a value and optional
    `subdocument` child
-   `problem` — a problem created during the parse attempt
