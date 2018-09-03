export PATH := ./node_modules/.bin:$(PATH)

SHELL := /bin/bash

install:
	npm install

lint:
	eslint --cache --fix .
	prettier --write *.md

unit-test:
	mocha --recursive test
