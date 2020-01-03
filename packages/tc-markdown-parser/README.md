# tc-markdown-parser

A tool for converting structured markdown files into payloads for writing to tc-api-rest-handlers

## API

### getParser(options)

Returns an object with a single method, `parseMarkdownString`. This takes a markdown string and attempts to parse it into a payload for sending to a treecreeper api.

#### Options

##### type

The type of record to parse the markdown as

##### titleFieldName

The `h1` title at the top pf the document will be set as this property in the payload. Defaults to `name`.

##### descriptionFieldName

The first paragraph below the `h1` title at the top pf the document will be set as this property in the payload. Defaults to `description`.

##### blacklistPropertyNames

Ab list pf property names which should not be allowed in the markdown file

#### Coercion

-   The first `h1` and paragraph are parsed into special fields defined in the parser options (see above)
-   `h2`'s are parsed as property names for the payload. They will be converted to camel case in a forgiving way: lower-cased, then concatenated with the first character after any space being upppercased
-   For boolean properties 'Yes' & 'No' are permissable in addition ato 'true' and 'false'

#### Output

`parseMarkdownString` returns an object with two properties: `{ data, errors }`.

If the document is parsed successfully, `data` will contain the treecreeper payload derived from the document.

If the document is not parsed successfully, `errors` will contain an array of objects of the following structure:

```js
{
  message, // description of the parsing issue
  position: {
    start: { line }, // details of where in the document the problem was encountered
  },
}
```

#### Example

Assuming the properties belwo correspond to those defined in a treecreeper schema, the following markdown document:

```
# My record

This is what it is

## Some property
The string value

## Some boolean property
Yes

## Some relationship
related-code

## Some multi relationship
- related-code1
- related-code2
```

When parsed using the following parser:

```js
getParser({
	type: 'SomeType',
	titleFieldName: 'reference',
	descriptionFieldName: 'preamble',
	blacklistPropertyNames: ['notAllowed'],
});
```

will be parsed as

```js
{
  reference: 'My record',
  preamble: 'This is what it is',
  someProperty: 'The string value',
  someBooleanProperty: true,
  someRelationship: 'related-code',
  someMultiRelationship: ['related-code1', 'related-code2']
}

```
