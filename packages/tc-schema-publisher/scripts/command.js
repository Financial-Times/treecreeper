#!/usr/bin/env node
/* eslint-disable no-console */
const program = require('commander');
const { join } = require('path');
const { readFileSync } = require('fs');

const pkg = JSON.parse(
	readFileSync(join(__dirname, '../package.json'), 'utf8'),
);

const { deploy } = require('./deploy');

const action = async (...args) => {
	const [command] = args;

	try {
		await deploy(command);
	} catch (err) {
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
