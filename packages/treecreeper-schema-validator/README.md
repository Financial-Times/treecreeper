# Treecreeper schema validator

Tests to validate that a set of yaml files conforms to the treecreeper schema specification

## TODO

-   [ ] Can this entire thing be turned into a CLI, rather than requiring creating a test file
-   [ ] Support validating in a single json file
-   [ ] Support validating a json file specified via a url

## Usage

Has a peer dependency of `jest`

// my-schema-tests.spec.js

```js
require('../../packages/schema-validator');
```

```sh
TREECREEPER_SCHEMA_DIRECTORY=path-to-schema-directory jest my-schema-tests.spec.js
```
