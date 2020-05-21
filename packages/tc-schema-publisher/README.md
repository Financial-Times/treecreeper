# @financial-times/tc-schema-publisher

This package saves a treecreeper schema to s3

## API

`sendSchemaToS3(environment, bucketName)`

This saves the rawData contained in the local `tc-schema-sdk` instance to the `bucketName` s3 bucket (defaulting to the environment variable `TREECREEPER_SCHEMA_BUCKET`), prefixing the file with an `/${environment}` prefix.

### Deploy CLI command

This package provides CLI command of `tc-schema-publisher` for publishing a set of schema yaml files to S3.

```
Usage: tc-schema-publisher [options]

Publish schemas to S3 bucket

Options:
  -D, --schema-directory <directory>  directory to the schema. (default: "process.env.TREECREEPER_SCHEMA_DIRECTORY")
  -B, --bucket-name <bucket>          S3 bucket name which you want to upload. (default: "process.env.TREECREEPER_SCHEMA_BUCKET")
  -E, --env <env>                     specify publish environment (default: "latest")

Example:

  tc-schema-publisher -D ./example-schema -B schema-bucket -E latest
```

You can see this help typing `tc-schema-publisher -h` and some option can override by specifying environment variables:

-   `TREECREEPER_SCHEMA_DIRECTORY` absolute path to the directory containing the schema yaml files
-   `TREECREEPER_SCHEMA_BUCKET` name of the treecreeper schema s3 bucket
