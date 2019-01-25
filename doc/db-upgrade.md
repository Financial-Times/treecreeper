# Database upgrade guide

The following steps should be followed when upgrading/downgrading the database **version**.

When changing the size of the database only, not the version, the local and CI upgrade steps can be skipped.

To up/downgrade the database **plan**, use [these instructions](#Changing-the-database-plan).

## Upgrading locally

1. Delete the `./neo4j/data/databases/graph.db` directory
1. Update the `image` section in `docker-compose.yaml` to reference the docker image for the version of neo4j you wish to upgrade to. A list can be found at [dockerhub](https://hub.docker.com/_/neo4j/)
1. Download the apoc library for the version of neo4j you wish to upgrade to https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases. Save it in `./neo4j/plugins`, deleting the previous copy
1. Run `make run-db` in one terminal
1. In another terminal run `make init-db test`
1. Keep plugging away until all tests pass (hopefully there will be next to no changes required). Be careful not to inadvertently change the format of the data being written/returned in order to make the tests pass

## Upgrading CI

Once everything is working locally with the new database, it's time to update CI to mirror the changes

1. In `./.circleci/config.yaml`:
    - Update the `NEO4J_VERSION` to reference the new version of the database
    - In the `Prepare neo4j database` task change `community` to `enterprise` (or vice versa) if changing database type
1. In `./scripts/neo4j-plugins` update the apoc version number to the same as the one you installed locally

The above should be enough to get the build to pass. Do not merge to master until you have _at least an hour's free time to attempt upgrading staging_

## Upgrading staging

1. Print this list out, or copy it to some format where you can check things off (e.g. paste as a checklist in a trello issue)
1. Download the apoc library for the version of neo4j you wish to upgrade to https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases
1. Make sure you have the [heroku cli](https://devcenter.heroku.com/articles/heroku-cli) installed and that you are signed in to the financial-times org (use `heroku login --sso`)
1. Communicate in the #biz-ops channel that the test api will experience downtime
1. Set `DISABLE_WRITES=true` & `DISABLE_READS=true` in the Config vars section of the **Settings** tab of the biz-ops-api-staging app's heroku dashboard
1. Merge your pull request to upgrade the api app and wait for it to be deployed to biz-ops-api-staging
1. Click through to the grapheneDB admin screen from the heroku dashboard for biz-ops-api-staging
1. In the **configure** tab, click **Edit configuration**, then enable read only mode, then **Apply and restart**
1. In the **Admin** tab, click **Export database**. Once the export is ready, click **Download** and save the file as `biz-ops-staging.zip`
1. Return to the heroku dashboard for `biz-ops-api-staging`. In the **Resources** tab, make a note of what name the graphene database is attached as, e.g. `GRAPHENEDB`, `GRAPHENEDB_CHARCOAL`..., and what the performance plan is
1. Create a new grapheneDB instance with the following command `heroku addons:create graphenedb:standard-2 --version v350 -a biz-ops-api-staging`. Replace `standard-2` with a lower case, hyphenated version of the performance plan you noted down in the previous step. replace the version with the database version you need, removing all `.`s from the version number
1. Reload the heroku dashboard **Resources** tab. You will see a new grapheneDB instance. Make a note of the name it is attached as. Click on the link to go into the GrapheneDB admin screens for it
1. In the grapheneDB **Admin** tab click on the **Restore database** button, and follow the steps to upload the `biz-ops-staging.zip` export.
1. In the **Extensions** tab click to add a new stored procedure. Type in the name `apoc` and upload the apoc JAR file you downloaded earlier. Remember to click **Enable** then **Apply changes** after the upload is finished
1. Verify the apoc procedure is installed by Launching **neo4j Browser** from the **Overview** tab. Then run the following query: `CALL dbms.procedures()`. You should see lots of procedures beginning with `apoc`
1. In the heroku dashboard settings tab look for all environment variables beginning with the name your new database is attached as. Copy all these values into the equivalent environment variables that begin with `NEO4J_`
1. Visit http://biz-ops-api-staging.herokuapp.com/__health and (possibly after waiting a few minutes) verify all checks are ok. If not, try restarting all dynos (drop down from the **more info** button on the heroku dashboard).
1. Set the environment variable `DISABLE_READS=false` in the heroku dashboard
1. Visit http://biz-ops-api-staging.herokuapp.com/graphiql and run the example query. It should be ok. If not, time to get debugging. _DO NOT PROCEED UNTIL THE QUERY IS FIXED_.
1. Have a browse through https://biz-ops-test.in.ft.com/ to make sure all pages load. _DO NOT PROCEED UNTIL ALL PAGES LOAD OK_.
1. Set the environment variable `DISABLE_WRITES=false` in the heroku dashboard
1. Verify (via https://biz-ops-test.in.ft.com/) that records can be successfully edited
1. Locally, set all your `NEO4J_` environment variables to be the same as the staging app and run `make test`. _DO NOT PROCEED UNTIL ALL TESTS PASS_.
1. Update [Vault](https://vault.in.ft.com:8080/ui/vault/secrets/secret/list/teams/reliability-engineering/biz-ops-api/) to contain the new values for the `NEO4J_` variables.
1. Announce in #biz-ops that the migration is complete
1. Delete the old grapheneDB instance in the **Resources** tab of the heroku dashboard

## Rollback

If any of the above stages fail in a way that is not easily resolvable, set the `NEO4J_` environment variables back to the values associated with the grapheneDB instance that existed previously. Also reenable reads and writes (both by setting environment variables and disabling read only mode in the grapheneDB admin dashboards). To avoid confusion and save costs, it's worth deleting the new database instance too (unless the intention is to carry out more investigation on it)

## Upgrading production

Steps are exactly the same as for staging except:

-   Wait a while after 'successfully' upgrading staging so that unexpected issues have a chance to show themselves - better to lose data and have to roll back staging, than to rush ahead and have to deal with the same problems in prod
-   Be **EXTRA** careful
-   Change names in the commands etc to refer to production rather than staging/test resources
-   Instead of merging a PR to update the app to the new database, click the heroku **Promote to production** button in the heroku [biz-ops-api pipeline dashboard](https://dashboard.heroku.com/pipelines/d5deb97d-5fa2-45f2-99fa-cd155328320d)
-   Copy the downtime announcement and upgrade complete announcement to #ft-tech-incidents and #engineering
-   DO NOT run the test suite against the production database
-   After upgrade is complete, wait a while (day or two?) before deleting the old DB

## Changing the database plan

1. Make sure you have the [heroku cli](https://devcenter.heroku.com/articles/heroku-cli) installed and that you are signed in to the financial-times org (use `heroku login --sso`)
1. Navigate to the Heroku dashboard and click on the app you are changing the plan for - staging or production.
1. Within that app's dashboard click through to the **Resources** tab and make a note of the name of the Graphene database that is attached, e.g. `GRAPHENEDB_TEAL`. To the right of that is the name of the current database plan, e.g. `Standard 2`.
1. Next, click through to the **Settings** tab and click **Reveal Config Vars**. Here make a note of the `GRAPHENEDB` config vars that correspond to the name of the current database e.g. `GRAPHENEDB_TEAL_URL`, `GRAPHENEDB_TEAL_BOLT_USER`, `GRAPHENEDB_TEAL_BOLT_URL` and `GRAPHENEDB_TEAL_BOLT_PASSWORD`. These should be the same as four corresponding `NEO4J_` config vars.
1. Changing the database plan will cause some [downtime while the database is stopped and cloned into a new one](https://devcenter.heroku.com/articles/graphenedb#changing-your-database-plan), so let the team know to expect this. Mention it in the #ft-tech-incidents channel when changing the production database plan and in the #biz-ops channel for staging.
1. Download the appropriate apoc library for the current version of neo4j https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases
1. Next, set the `DISABLE_WRITES` and `DISABLE_READS` to equal `true` in the config vars section of the Heroku **Settings** tab.
1. Click through to the grapheneDB admin screen from the heroku **Resources** tab. There, in the configure tab, click **Edit configuration**, then enable read only mode, then **Apply and restart**.
1. Go back to the Heroku **Resources** tab and under `Add-ons` use the drop-down menu on the far right of the grapheneDB instance to click `Modify Plan` and choose the new database plan. The different plans and pricing options are outlined [here](https://elements.heroku.com/addons/graphenedb).
1. In the grapheneDB **Extensions** tab click to add a new stored procedure. Type in the name apoc and upload the apoc JAR file you downloaded earlier. Remember to click **Enable** then **Apply changes** after the upload is finished.
1. Verify the apoc procedure is installed by Launching the neo4j Browser from the **Overview** tab. Then run the following query: CALL dbms.procedures(). You should see lots of procedures beginning with apoc.
1. Back in the Heroku dashboard **Settings** tab, you will notice that the values for the `GRAPHENEDB` config variables you made a note of earlier have changed. Copy these values into the equivalent variables that begin with `NEO4J_`.
1. Visit http://biz-ops-api-staging.herokuapp.com/__health and (possibly after waiting a few minutes) verify that all checks are ok. If not, try restarting all dynos (drop down from the more info button on the herouku dashboard).
1. Set the environment variable DISABLE_READS=false in the heroku dashboard.
1. Visit http://biz-ops-api-staging.herokuapp.com/graphiql and run the example query. It should be ok. If not, time to get debugging. DO NOT PROCEED UNTIL THE QUERY IS FIXED.
1. Have a browse through https://biz-ops-test.in.ft.com/ to make sure all pages load. DO NOT PROCEED UNTIL ALL PAGES LOAD OK.
1. Set the environment variable DISABLE_WRITES=false in the heroku dashboard.
1. Verify (via https://biz-ops-test.in.ft.com/) that records can be successfully edited.
1. Update [Vault](https://vault.in.ft.com:8080/ui/vault/secrets/secret/list/teams/reliability-engineering/biz-ops-api/) to contain the new values for the NEO4J\_ variables.
1. You can now announce in #biz-ops(staging) or #ft-tech-incidents(production) that the update is complete.
