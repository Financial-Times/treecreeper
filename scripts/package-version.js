const semver = require('semver');
const { statSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const [pkg, mode] = [process.argv[2], process.argv[3]];

if (!pkg) {
	throw new Error('package name must be specified');
}
const prefixedPackage = pkg.startsWith('@treecreeper/')
	? pkg
	: `@treecreeper/${pkg}`;
const unprefixedPackage = pkg.startsWith('@treecreeper/')
	? pkg.replace('@treecreeper/', '')
	: pkg;

const packagePath = join(__dirname, '../packages/', unprefixedPackage);
if (!statSync(packagePath).isDirectory()) {
	throw new Error(`Error: ${unprefixedPackage} is not a directory`);
}
const packageJsonPath = join(packagePath, 'package.json');
if (!statSync(packageJsonPath).isFile()) {
	throw new Error(`Error: ${unprefixedPackage} doesn't have a package.json`);
}
const pkgJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
if (pkgJson.name !== prefixedPackage) {
	throw new Error(`Error: package name unmatched against ${prefixedPackage}`);
}
const oldVersion = pkgJson.version;
if (!mode) {
	console.log(`${prefixedPackage} current version is ${oldVersion}`);
} else {
	pkgJson.version = semver.inc(oldVersion, mode);
	writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, '  '), 'utf8');
	console.log(
		`package ${prefixedPackage} version has been updated from ${oldVersion} to ${pkgJson.version}`,
	);
}
