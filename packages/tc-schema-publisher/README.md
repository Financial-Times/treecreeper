# @financial-times/tc-schema-publisher

This package saves a treecreeper schema to s3

## API

`sendSchemaToS3(bucketName, environment, schemaObject)`

This saves the data provided in `schemaObject` to the `bucketName` s3 bucket, prefixing the file with an `/${environment}` prefix. The filename is determined by the `@financial-times/tc-schema-file-name` utility (which calculates it from the version number of the package). `scheamObject` shodul be the output of `schema.rawData.getAll()`, where schema is an instance of `@financial-times/tc-schema-sdk`

### Deploy CLI command

This package provides CLI command of `tc-schema-publisher`

```
Usage: tc-schema-publisher [options]

Publish schemas to S3 bucket

Options:
  -D, --schema-directory <directory>  directory to the schema. (default: "process.env.TREECREEPER_SCHEMA_DIRECTORY")
  -B, --bucket-name <bucket>          S3 bucket name which you want to upload. (default: "process.env.TREECREEPER_SCHEMA_BUCKET")
  -E, --env <env>                     specify publish environment (default: "latest")
  -V, --version                       output the version number
  -h, --help                          output usage information

Example:

  tc-schema-publisher -D ./example-schema -B schema-bucket -v latest
```

You can see this help typing `tc-schema-publisher -h` and some option can override by specifying environment variables:

-   `TREECREEPER_SCHEMA_DIRECTORY` absolute path to the directory containing the schema yaml files
-   `TREECREEPER_SCHEMA_BUCKET` name of the treecreeper schema s3 bucket

It will publish a schema to S3 based on semver tagging of the repo
