export PATH := ./node_modules/.bin:$(PATH)

SHELL := /bin/bash

install:
	npm install

lint:
	eslint --cache --fix .
	prettier --write *.md

lint-ci:
	eslint --cache .

unit-test:
	jest

publish:
	npm version --no-git-tag-version ${CIRCLE_TAG}
	npm publish --access public
