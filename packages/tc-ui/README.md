# tc-ui

User interface for administering Treecreeper data. It provides:

-   CMS style view and edit pages
-   primitive components, that can be combined by users how they wish

## Limitations

At present the UI is tightly coupled to teh FT's origami buiold service. The plan is to move towards a self-contained implementation, but for the time being it's not possible

## API

### `getCMS(options)`

This returns an object containing 3 handlers: `{ viewHandler, deleteHandler, editHandler }`

Each handler accepts input, and returns output, of similar structure to `tc-api-trest-handlers`:

#### input

An object with the following properties

```
{
  type, // the type of record to view/edit
  code, // the code of the record to view/edit
  metadata: // object similar to the metadata objects used by `tc-api-rest-handlers`
  query: req.query || {}, // query string of the request, parsed into an object
  method: req.method, // http method used for the request
  body: req.body, // body sent with the request
}
```

#### Output

A `{status, body, headers}` object

#### Options

##### logger

Choice of logger to use

##### restApiUrl

Base url for the treecreeper REST api

##### graphqlApiUrl

Base url for the treecreeper GraphQL api

##### apiHeaders

Function that is passed the object received as input, and should return an object containig the headers to use when calling the treecreeper endpoints

##### Subheader

Optional React component for rendering a subheader when viewing records. It is passedf all the props used to render the page, and is useful for e.g. rendering links to related resources

##### customComponents

Array of primitive components to use for rendering types of data, e.g. you may want to render a `StarRating` type using a different component to a normal numeric field. (see the section on Primitive Components below to see what structure each one should be in)

##### customTypeMappings

Object defining which components should be used to render which types e.g.

```
{
    Paragraph: 'LargeText',
    Temperature: 'Slider'
}
```

##### renderPage({ template, data, event = {}, status = 200 })

Function for rendering the CMS as a full page. The tc-ui package only provides the main content of the page, and logic for handling any data submitted, but this needs to be contained within a full page of the developer's own choosing and implementation. The object the function will receive contains the following properties

-   `template` - the React template for rendering the view/edit screen for the current record
-   `data` - the complete data needed to populate the screen for the current record.
-   `event` - the original event received by the handler
-   `status` - the status to respond with

It should return a `{status, body, headers}` object

##### handleError(err)

Function for handling any errors. Should ideally return a `{status, body, headers}` object in orer to present the user with a friendly error message

#### Client side code

Styling and client side interactivity are dependent on a few things:

-   If using webpack or a similar build tool that respects the `browser` field of package.json, `import @financial-times/tc-ui` in your client side bundle
-   On the server side, `origamiModules: { css, js }` retrieves lists of components uyou will need to include. Currently no mechanism is provided to automate including them - sorry

#### Example

See the demo directory of this repository.

### Primitive components

At the heart of the CMS are a set of primitive components. These allow any property of any record to be displayed and edited in a consistent way.

tc-ui provides 6 of these by default, but the user may provide more that implement the same interface in order to provide custom views and edit tools. Those bundled intc-ui are:

-   Boolean
-   Text
-   LargeText
-   Number
-   Relationship
-   Temporal
-   Enum
-   MultipleChoice

See tc-schema-sdk/data-accessors/primitive-types.js to see which components are used for rendering which default primitive data types

Each primitive component constitutes of one or more of the following:

-   browser.js - Client side js needed to interact with the component (not required in most cases)
-   main.css - Client side css needed to render the component (not required in most cases)
-   server.js - The server side code to render the component

server.js will export 5 properties:

#### ViewComponent

The React component for rendering a view of the data. Should expect the following 2 properties:

-   id - the name of the property
-   value - the value for the property retrieved from the treecreeper api

#### EditComponent

The React component for rendering an editable view of the data.
//TODO document the interface

#### hasValue(value)

Function for determnining if a property contains a real value. Defaults to whether the property's value is 'truthy' but e.g. for Boolean properties, this is not an adequate check

#### parser({value, hasMany})

Function for converting the value retrieved from the form POST data into a value to be sent to the treecreeper API. Defaults to a noop, but some components require that the data be preprocessed

#### graphqlFragment(propName, prodDef)

Function for converting the property into a fragment to put in a GraphQL query. Defaults to just outputting the field name

If all the above are defined correctly, then a new component can be used in your CMS by defining a mapping in your schema's primitive types and then passing in the component as an option when creating the CMS
