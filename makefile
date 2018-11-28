export PATH := ./node_modules/.bin:$(PATH)

# Export environment variables if a .env file is present.
ifeq ($(ENV_EXPORTED),) # ENV vars not yet exported
ifneq ("$(wildcard .env)","")
sinclude .env
export $(shell [ -f .env ] && sed 's/=.*//' .env)
export ENV_EXPORTED=true
$(info Note — An .env file exists. Its contents have been exported as environment variables.)
endif
endif

SHELL := /bin/bash
STAGE ?= test

.PHONY: test

deploy-aws:
	aws cloudformation deploy --stack-name biz-ops-kinesis --template-body file://$(shell pwd)/aws/cloudformation/biz-ops-kinesis.yaml

test:
	@if [ -z $(CIRCLECI) ]; \
		then jest test/v2 --watch; \
		else jest test/v2; \
	fi

lint:
	eslint --cache --fix .

run:
	nodemon server/app.js

db:
	docker-compose up
