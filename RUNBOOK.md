<!--
    Written in the format prescribed by https://github.com/Financial-Times/runbook.md.
    Any future edits should abide by this format.
-->

# Biz Ops Schema

Stores the schema that drives the Biz Ops api and other parts of the Biz ops ecosystem. An S3 bucket containing JSON files.

## Primary URL

https://s3.eu-west-1.amazonaws.com/biz-ops-schema.510688331160/latest/v3.json

## Service Tier

Bronze

## Lifecycle Stage

Production

## Delivered By

reliability-engineering

## Supported By

reliability-engineering

## Technical Owner

rhys.evans

## Host Platform

S3

## Architecture

![image](https://user-images.githubusercontent.com/447559/55995243-e4d77800-5cab-11e9-8713-8d0ea7485108.png)

Creating a github tag (1.) triggers a circleci build (2.) which, on success, publishes the schema files to s3 on the path `/latest/vX.json` (where X is the major version) (3a.), and publishes the javascript library to NPM (3b.). biz-ops-api polls `/latest/vX.json` (4.) and when an update is detected, it constructs and updated graphQL api, then publishes the schema file to `/api/vX.json` (5.). biz-ops-admin and other secondary consumers of the data poll `/api/vX.json` for updates to the schema (6.).

The [biz-ops-schema library](https://www.npmjs.com/package/@financial-times/biz-ops-schema) can be installed by nodejs applications and is used to poll for data from the bucket.

## Contains Personal Data

false

## Contains Sensitive Data

false

## Can Download Personal Data

false

## Can Contact Individuals

false

## Failover Architecture Type

NotApplicable

## Failover Process Type

NotApplicable

## Failback Process Type

NotApplicable

## Data Recovery Process Type

PartiallyAutomated

## Data Recovery Details

Run the last successful tagged build in CI. It will fail as the step that publishes to npm does not allow duplicate tags. However, the stage that publishes to S3 happens before this. Inspect the build output and check the [AWS console](https://s3.console.aws.amazon.com/s3/buckets/biz-ops-schema.442980623726/?region=eu-west-1&tab=overview) to make sure the schema json file has published correctly to s3

## Release Process Type

FullyAutomated

## Rollback Process Type

PartiallyAutomated

## Release Details

See technical overview to see how a version of the schema propagates across the Biz Ops stack

The s3 bucket is versioned so the quickest way to roll back a bad version is to go to the [AWS console](https://s3.console.aws.amazon.com/s3/buckets/biz-ops-schema.442980623726/?region=eu-west-1&tab=overview) , find the bad file and reinstate the previous version.

It is however preferable to fix the code on master (usually by reverting the last pull request), and publish a new release with a semver tag

## Key Management Process Type

Manual

## Key Management Details

Keys are only used on deploy to publish to s3. These keys are manually updated in vault when they expire, and pulled into circleci at build time

## Monitoring

Pingdom - https://my.pingdom.com/reports/uptime#check=5380252&daterange=7days&tab=uptime_tab

## First Line Troubleshooting

Systems use this by polling for a file from s3. The only complexity lies in deploying new versions. Very little should go wrong out of hours.

## Second Line Troubleshooting

Once applications are integrated with the schema and its library that polls for changes, I don't think we have had any issues, so not much to say here either. Will fill in more details as and when something goes wrong.

See the [README.md](https://github.com/Financial-Times/biz-ops-schema/blob/master/README.md) for details of how to set up an application to use the schema
