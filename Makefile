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

# note that this invokes npm install, and in package.json there is a postinstall script
# defined too, which installs all the node_modules for the packages
install:

monorepo-publish:
	npx athloi version --concurrency 10 $(CIRCLE_TAG)
	npx athloi publish --concurrency 10 -- --access public

.PHONY: test

deploy-aws:
	aws cloudformation deploy --stack-name biz-ops-kinesis --template-body file://$(shell pwd)/aws/cloudformation/biz-ops-kinesis.yaml

test:
	# Make sure db constraints are set up to avoid race conditions between the first two test suites
	TREECREEPER_SCHEMA_DIRECTORY=example-schema node ./packages/tc-api-db-manager/index.js
	@if [ -z $(CI) ]; \
		then TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 \
			jest --config="./jest.config.js" "${pkg}.*__tests__.*/${spec}.*.spec.js" --testEnvironment=node --watch; \
		else TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema \
			jest --config="./jest.config.js" "__tests__.*/*.spec.js" --testEnvironment=node --maxWorkers=1 --ci --reporters=default --reporters=jest-junit; \
	fi

run:
	TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema nodemon --inspect demo/api.js

run-db:
	docker-compose up

init-db:
	TREECREEPER_SCHEMA_DIRECTORY=example-schema packages/tc-api-db-manager/index.js

clean-deps:
	rm -rf packages/*/node_modules
	rm -rf node_modules
	rm package-lock.json
	npm install
