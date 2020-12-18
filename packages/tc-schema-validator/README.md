# Treecreeper schema validator

Tests to validate that a set of yaml files conforms to the treecreeper schema specification

## TODO

-   [ ] Can this entire thing be turned into a CLI, rather than requiring creating a test file
-   [ ] Support validating in a single json file
-   [ ] Support validating a json file specified via a url

## Usage


`npm install @financial-times/tc-schema-validator`

Set the environment variables accepted by tc-schema-sdk to point at a schema: TREECREEPER_SCHEMA_URL or   TREECREEPER_SCHEMA_DIRECTORY.

Then run `tc-schema-validator`

e.g. 

```sh
TREECREEPER_SCHEMA_DIRECTORY=path-to-schema-directory tc-schema-validator
```
