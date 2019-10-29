# ---------------------------
# Generated by rel-engage

# This task tells make how to 'build' n-gage. It npm installs n-gage, and # Once that's done it overwrites the file with its own contents - this
# ensures the timestamp on the file is recent, so make won't think the file
# is out of date and try to rebuild it every time
node_modules/@financial-times/rel-engage/index.mk:
	@echo "Updating rel-engage"
	@npm install --save-dev @financial-times/rel-engage
	@touch $@

# If, by the end of parsing your `Makefile`, `make` finds that any files
# referenced with `-include` don't exist or are out of date, it will run any
# tasks it finds that match the missing file. So if n-gage *is* installed
# it will just be included; if not, it will look for a task to run
-include node_modules/@financial-times/rel-engage/index.mk

# End generated by rel-engage
# ---------------------------

PROJECT_NAME=biz-ops-api
PRODUCT_NAME=biz-ops

env:
	node ./$(PATH_TO_RELENGAGE)/packages/vault/get-env.js $(PROJECT_NAME)/dev $(PROJECT_NAME)/test PRODUCTS/$(PRODUCT_NAME)/test

verify:

install:

.PHONY: test

deploy-aws:
	aws cloudformation deploy --stack-name biz-ops-kinesis --template-body file://$(shell pwd)/aws/cloudformation/biz-ops-kinesis.yaml

test:
	@if [ -z $(CI) ]; \
		then TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "__tests__.*/*.spec.js" --testEnvironment=node --watch; \
		else TREECREEPER_SCHEMA_DIRECTORY=example-schema jest "__tests__.*/*.spec.js" --testEnvironment=node --maxWorkers=2 --ci --reporters=default --reporters=jest-junit; \
	fi

test-pkg:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "packages/.*__tests__.*/*.spec.js" --testEnvironment=node --watch ; \

test-schema:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "example-schema/.*__tests__.*/*.spec.js" --testEnvironment=node --watch; \

test-api:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "api/.*__tests__.*/*.spec.js" --testEnvironment=node --watch; \

test-pkg-api:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "packages/api.*/.*__tests__.*spec.js" --testEnvironment=node --watch; \

test-pkg-docstore:
	TREECREEPER_DOCSTORE_S3_BUCKET=example-bucket DEBUG=true TIMEOUT=500000 jest "packages/api-s3-document-store/__tests__/.*.spec.js" --testEnvironment=node --watch; \

test-pkg-rest-handlers:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "packages/api-rest-handlers/__tests__/patch-field-locking.spec.js" --testEnvironment=node --watch; \

test-api-docs:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "packages/api-rest-handlers/__tests__/document-store\.spec.js" --testEnvironment=node --watch; \

test-pkg-api-publish:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 jest "packages/api-publish/__tests__/.*.spec.js" --testEnvironment=node --watch; \


run:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema nodemon --inspect api/server/app.js

demo-api:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema nodemon --inspect demo/api.js

run-db:
	docker-compose up

init-db:
	server/init-db.js

# load-testing
load-test-run:
	docker-compose -f scripts/load-testing/statsd/docker-compose.yaml up -d && \
	artillery run scripts/load-testing/$(TEST_NAME).yaml && \
	docker-compose -f scripts/load-testing/statsd/docker-compose.yaml down

load-test-generateData:
	node scripts/load-testing/lib/generate/index

load-test-readQueries:
	TEST_NAME=readQueries npm run test:load:run

load-test-writeQueriesForGroups:
	TEST_NAME=writeQueriesForGroups npm run test:load:run && node scripts/load-testing/clean-up

load-test-writeQueriesForSystems:
	TEST_NAME=writeQueriesForSystems npm run test:load:run && node scripts/load-testing/clean-up

load-test-writeQueriesForTeams:
	TEST_NAME=writeQueriesForTeams npm run test:load:run && node scripts/load-testing/clean-up

load-test-cleanUp:
	node scripts/load-testing/clean-up

s3-publish:
	@node schema/scripts/deploy

