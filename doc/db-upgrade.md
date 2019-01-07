# Database upgrade guide

## Upgrading staging

1. Print this list out, or copy it to some format where you can check things off (e.g. paste as a checklist in a trello issue)
1. Download the apoc library for the version of neo4j you wish to upgrade to https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases
1. Make sure you have the [heroku cli](https://devcenter.heroku.com/articles/heroku-cli) installed and that you are signed in to the financial-times org (use `heroku login --sso`)
1. Communicate in the #biz-ops channel that the test api will experience downtime
1. Set `DISABLE_WRITES=true` & `DISABLE_READS=true` in the Config vars section of the __Settings__ tab of the biz-ops-api-staging app's heroku dashboard 
1. Click through to the grapheneDB admin screen from te heroku dashboard for biz-ops-api-staging
1. In the __configure__ tab, click __Edit configuration__, then enable read only mode, then __Apply and restart__
1. In the __Admin__ tab, click __Export database__. Once the export is ready, click __Download__ and save the file as `biz-ops-staging.zip` 
1. Return to the heroku dashboard for `biz-ops-api-staging`. In the __Resources__ tab, make a note of what name the graphene database is attached as, e.g. `GRAPHENEDB`, `GRAPHENEDB_CHARCOAL`..., and what the performance plan is
1. Create a new grapheneDB instance with the following command `heroku addons:create graphenedb:standard-2 --version v350 -a biz-ops-api-staging`. Replace `standard-2` with a lower case, hyphenated version of the performance plan you noted down in the previous step. replace the version with the database version you need, removing all `.`s from the version number
1. Reload the heroku dashboard __Resources__ tab. You will see a new grapheneDB instance. Make a note of the name it is attached as. CLick on the link to go into the GrapheneDB admin screens for it
1. In the __Admin__ tab click on the __Restore database__ button, and follow the steps to upload the `biz-ops-staging.zip` export.
1. In the __Extensions__ tab click to add a new stored procedure. Type in the name `apoc` and upload the apoc JAR file you downloaded earlier. Remember to click __Apply changes__ after the upload is finished
1. Verify the apoc procedure is installed by Launching __neo4j Browser__ from the __Overview__ tab. Then run the following query: `CALL dbms.procedures()`. You should see lots of procedures beginning with `apoc`
1. In the heroku dashboard settings tab look for all environment variables beginning with the name your new database is attached as. Copy all these values into the equivalent environment variables that begin with `NEO4J_`
1. Visit http://biz-ops-api-staging.herokuapp.com/__health and (possibly after waiting a few minutes) verify all checks are ok. If not, try restarting all dynos (drop down from the __more info__ button on the herou dashboard)
1. Set the environment variable `DISABLE_READS=false` in the heroku dashboard
1. Visit http://biz-ops-api-staging.herokuapp.com/graphiql and run the example query. It should be ok. If not, time to get debugging. _DO NOT PROCEED UNTIL THE QUERY IS FIXED_.
1. Have a browse through https://biz-ops-test.in.ft.com/ to make sure all pages load. _DO NOT PROCEED UNTIL ALL PAGES LOAD OK_.
1. Set the environment variable `DISABLE_WRITES=false` in the heroku dashboard
1. Verify (via https://biz-ops-test.in.ft.com/) that records can be successfully edited
1. Locally, set all your `NEO4J_` environment variables to be the same as the staging app and run `make test`. _DO NOT PROCEED UNTIL ALL TESTS PASS_.
1. Update vault to contain the new values for the `NEO4J_` variables. 
1. Announce in #biz-ops that the migration is complete
1. Delete the old grapheneDB instance in the __Resources__ tab of the heroku dashboard

## Rollback

If any of the above stages fail in a way that is not easily resolvable, set the `NEO4J_` environment variables back to the values associated with the grapheneDB instance that existed previously. Also reenable reads and writes (both by setting environment variables and disabling read only mode in the grapheneDB admin dashboards). To avoid confusion and save costs, it's worth deleting the new database instance too (unless the intention is to carry out more investigation on it)

## Upgrading production

Steps are exactly the same as for staging except:
- Wait a while after 'successfully' upgrading staging so that unexpected issues have a chance to show themselves - better to lose data and have to roll back staging, than to rush ahead and have to deal with the same problems in prod
- Be __EXTRA__ careful
- Change names in the commands etc to refer to production rather than staging/test resources
- Copy the downtime announcement and upgrade complete announcemnt to #ft-tech-incidents and #engineering
- DO NOT run the test suite against the production database
- After upgrade is complete, wait a while (day or two?) before deleting the old DB
