#!/usr/bin/env node

const program = require('commander');
const { join } = require('path');
const { statSync, readFileSync } = require('fs');
const schema = require('@financial-times/tc-schema-sdk');
const { sendSchemaToS3 } = require('..');

const pkg = JSON.parse(
	readFileSync(join(__dirname, '../package.json'), 'utf8'),
);

const action = async (...args) => {
	const [command] = args;
	const { schemaDirectory, bucketName, environment } = command;
	try {
		if (!bucketName) {
			throw new Error(
				'bucket name is required. You need to specify it via -B, --bucket-name option',
			);
		}
		if (!environment) {
			throw new Error(
				'environment is required. You need to specify it via -E, --environment option',
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

		schema.init({ schemaDirectory });
		await schema.ready();

		const schemaObject = {
			...schema.rawData.getAll(),
			version: process.env.CIRCLE_TAG,
		};
		await sendSchemaToS3(bucketName, 'latest', schemaObject);
		console.log('successfully deployed');
	} catch (err) {
		console.error('Failed to deploy');
		console.error(err);
		process.exit(2); // eslint-disable-line unicorn/no-process-exit
	}
};

const help = () => {
	const template = `
Example:

  tc-schema-publisher -D ./example-schema -B schema-bucket -v latest
`;
	console.log(template);
};

program
	.name('tc-schema-publisher')
	.description('Publish schemas to S3 bucket')
	.option(
		'-D, --schema-directory <directory>',
		'directory to the schema. (default: "process.env.TREECREEPER_SCHEMA_DIRECTORY")',
		process.env.TREECREEPER_SCHEMA_DIRECTORY,
	)
	.option(
		'-B, --bucket-name <bucket>',
		'S3 bucket name which you want to upload. (default: "process.env.TREECREEPER_SCHEMA_BUCKET")',
		process.env.TREECREEPER_SCHEMA_BUCKET,
	)
	.option('-E, --env <env>', 'specify publish environment', 'latest')
	.version(pkg.version)
	.action(action)
	.on('--help', help);

program.parse(process.argv);
