#!/usr/bin/env node
/* eslint-disable no-console */
const { join } = require('path');
const { statSync } = require('fs');
const { SDK } = require('@financial-times/tc-schema-sdk');
const { sendSchemaToS3 } = require('..');

const deploy = async command => {
	const { schemaDirectory, bucketName, env, includeTestDefinitions } =
		command;

	try {
		if (!bucketName) {
			throw new Error(
				'bucket name is required. You need to specify it via -B, --bucket-name option',
			);
		}
		if (!env) {
			throw new Error(
				'env is required. You need to specify it via -E, --env option',
			);
		}
		if (!schemaDirectory) {
			throw new Error(
				'schema directory is required, you need to specify it via -D, --schema-directory option',
			);
		}
		const stat = statSync(join(process.cwd(), schemaDirectory));
		if (!stat.isDirectory()) {
			throw new Error('schema directory is not a directory');
		}
		const schema = new SDK({ schemaDirectory, includeTestDefinitions });
		await sendSchemaToS3(env, bucketName, schema);
		console.log('successfully deployed');
	} catch (err) {
		console.error('Failed to deploy');
		console.error(err);
		throw err;
	}
};

module.exports = { deploy };
