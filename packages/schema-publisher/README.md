# @treecreeper/schema-publisher

This package saves a treecreeper schema to s3

## API
`sendSchemaToS3(bucketName, environment, schemaObject)`

This saves the data provided in `schemaObject` to the `bucketName` s3 bucket, prefixing the file with an `/${environment}` prefix. The filename is determined by the `@treecreeper/schema-file-name` utility (which calculates it from the version number of the package). `scheamObject` shodul be the output of `schema.rawData.getAll()`, where schema is an instance of `@treecreeper/schema-sdk`

### Deploy helper script
Eventually this will become a cli, but for now it's a very FT specific deploy script that can be called in CI. With the following environment variables:
- `TREECREEPER_SCHEMA_DIRECTORY` absolute path to the directory containing the schema yaml files
- `TREECREEPER_SCHEMA_BUCKET` name of the treecreeper schema s3 bucket

It will publish a schema to S3 based on semver tagging of the repo


