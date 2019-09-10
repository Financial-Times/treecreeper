<!--
    Written in the format prescribed by https://github.com/Financial-Times/runbook.md.
    Any future edits should abide by this format.
-->

# Biz Ops API

The Business Operations API. Stores information about various aspects of the FT and its technology (systems/contacts/teams/products) in a graph datastore (Neo4j) and exposes this via GraphQL and REST Apis.

## Primary URL

https://api.ft.com/biz-ops

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

## Known About By

-   rhys.evans
-   geoff.thorpe
-   dora.militaru

## Contains Personal Data

true

## Contains Sensitive Data

false

## Pii Destinations

-   biz-ops-search
-   biz-ops-admin
-   biz-ops-runbooks

## Replaces

-   dewey-sync
-   cmdb3

## Host Platform

Heroku, GrapheneDB

## Architecture

This is a single heroku application connected to a neo4j database instance hosted by GrapheneDB

Data changes are posted into the [biz-ops-crud_v1 kinesis stream in the ft-reliability-engineering-prod AWS account](https://eu-west-1.console.aws.amazon.com/kinesis/home?region=eu-west-1#/streams/details?streamName=biz-ops-crud_v1&tab=details)

## Dependencies

-   biz-ops-schema
-   apigateway

## Data Recovery Process Type

Manual

## Failover Architecture Type

NotApplicable

## Failover Process Type

NotApplicable

## Failback Process Type

NotApplicable

## Failover Details

Only a Bronze application, so has a single instance running in EU

## Release Process Type

PartiallyAutomated

## Rollback Process Type

FullyAutomated

## Release Details

Master branches are automatically deployed to the [biz-ops-api-staging](http://biz-ops-api-staging.herokuapp.com/__health) in the [Biz Ops Api Heroku pipeline](https://dashboard.heroku.com/pipelines/d5deb97d-5fa2-45f2-99fa-cd155328320d), from where they can be promoted to production.

Rollback is by click of a button on the [heroku activity screen](https://dashboard.heroku.com/apps/biz-ops-api/activity).

## Key Management Process Type

Manual

## Key Management Details

Keys and credentials are stored in [vault](https://vault.in.ft.com:8080/ui/vault/secrets/secret/list/teams/reliability-engineering/biz-ops-api/), but are manually copy pasted into heroku.

Whenever the grapheneDb neo4j instance is upgraded/changed it generates new keys under new names automatically, which need copying into vault and back into heroku under our stable environment variable names. [Full DB change guide](https://github.com/Financial-Times/biz-ops-api/blob/master/doc/db-upgrade.md).

If you need to change the Neo4j credentials, access the Graphene DB console through Heroku. In the Connection tab, under Rotate Database Credentials, click Update variables. This will update the following Config Vars (found in Settings) in Heroku: GRAPHENEDB_TEAL_URL, GRAPHENEDB_TEAL_BOLT_USER, GRAPHENEDB_TEAL_BOLT_URL and GRAPHENEDB_TEAL_BOLT_PASSWORD. These need to be copied to the following Config Vars: NEO4J_URL, NEO4J_BOLT_USER, NEO4J_BOLT_URL and NEO4J_BOLT_PASSWORD and also copied to Vault.

## Data Recovery Process Type

Manual

## Data Recovery Details

If Data is deemed to have gotten in a bad state the first thing to do is to disable writes, and if the degradation in data quality is so bad it is causing problems downstream with inaccurate data, it is best to disable reads too.

These can be achieved by setting the `DISABLE_WRITES` and `DISABLE_READS` environment variables to true by visiting https://dashboard.heroku.com/apps/biz-ops-api/settings, clicking 'Reveal Config Vars' and editing the values for those variables.

GrapheneDB heroku add-on generates backups. Each one has a _restore_ link, and the one next to the most recent backup should be clicked

1. Visit https://dashboard.heroku.com/apps/biz-ops-api/resources and click through to the graphenedb admin screen
2. Click on the backups tab
3. Click take snapshot now and wait for it to confirm it's finished (may need to refresh the page as it somefimes hangs - look for a new backup in the list with a very recent timestamp to confirm it's finished)
4. Click restore on the backup taken before data problems were uncovered
5. Set `DISABLE_READS` to false. If the the cause of the initial data problems has been found and fixed, `DISABLE_WRITES` can also be set to false

Document properties stored in the S3 bucket biz-ops-documents.{aws-account-id} (EU West) are backed up to a replication bucket: biz-ops-documents.{aws-account-id}.backup (US East) in case of loss of the whole EU bucket. Both buckets have versioning on for recovery of inividual nodes/properties.

## Monitoring

You can see the API activity/performance/load in Heroku https://dashboard.heroku.com/apps/biz-ops-api/metrics/web

There is also a grafana dashboard for more detailed performance stats http://grafana.ft.com/d/YCWfk4smk/biz-ops-api

Splunk logs can be found in `index=heroku source=*biz-ops-api*`. Use `index=heroku source=*biz-ops-api* | stats count by event` to see the different types of log that are sent.

## Healthchecks

-   biz-ops.api.ft.com-https
-   biz-ops-staging.api.ft.com-https
-   biz-ops.api.ft.com-http
-   biz-ops-staging.api.ft.com-http

## First Line Troubleshooting

The primary concern with this application is data consistency. If there are any concerns over the data stored in Biz Ops being damaged please follow the Data Recovery section of this runbook.

If the response time chart here https://dashboard.heroku.com/apps/biz-ops-api/metrics/web?ending=0-hours-ago&amp;starting=24-hours-ago, shows high response times, click 'restart all dynos' from the 'more' button in the top right.

If the problem persists, click the graphenedb link on this page https://dashboard.heroku.com/apps/biz-ops-api/resources, then navigate to admin and click 'restart database'

If the problem does not resolve and searching splunk for `index=heroku source=*biz-ops-api* error` has lots of mentions of "neo4j" or "database", escalate to support@graphenedb.com, quoting application instance in the url of the graphenedb admin screens e.g. **app12345678-ABCDEF**

## Second line troubleshooting

In general, best advice is to search the logs (see Monitoring section of this runbook).

If there appears to be a specific bug with the app's behaviour, rather than some general unhealthy state, always begin with the tests. This application's development is heavily driven by high integration test coverage. Try to replicate the exact error by adding/adjusting a test, then tackle the problem in the source code.

Some known issues that may occur:

### Missing System records in SalesForce

Sometimes api calls for a particular system will fail because of problems creating a corresponding record for the system in salesforce. Steps to debug:

1. Check there actually is a record for the System in Biz Ops. If not, create one, then wait a few seconds and check to see if SF_ID is populated for the record
   Steps are
1. Check to see if the system exists in salesforce (open https://force.ft.com and search for the system code). If it does, click through to the record and copy the hexidecimal id from tbe url. Go to Biz Ops admin and save this value in the SF_ID field
1. If there is no salesforce record then, in theory, a trivial PATCH to the system record (e.g. a trivial punctuation change in biz ops admin) should trigger creating in SF
