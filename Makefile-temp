export PATH := ./node_modules/.bin:$(PATH)

SHELL := /bin/bash

.PHONY: test

install:
	npm install

lint:
ifneq ($(CIRCLECI),)
	eslint .
else
	eslint --cache --fix .
	prettier --write *.md
endif

test:
ifneq ($(CIRCLECI),)
	jest test
else
	jest test --watch
endif

publish:
	npm version --no-git-tag-version ${CIRCLE_TAG}
	npm publish --access public
