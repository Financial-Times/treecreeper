const { existsSync, unlinkSync, readFileSync } = require('fs');
const { execSync } = require('child_process');

const pkgJson = JSON.parse(readFileSync('./package.json', 'utf8'));

if (existsSync('./package-lock.json')) {
	unlinkSync('./package-lock.json');
}

const deps = Object.keys(pkgJson.dependencies || {}).filter(pkgName =>
	pkgName.startsWith('@treecreeper/'),
);
const devDeps = Object.keys(pkgJson.devDependencies || {}).filter(pkgName =>
	pkgName.startsWith('@treecreeper/'),
);

const internalPackages = new Set(deps.concat(devDeps));

for (const pkg of internalPackages) {
	console.log(`linking ${pkg}`);
	execSync(`npm link ${pkg}`, { cwd: process.cwd() });
}
console.log(`linking this package`);
execSync(`npm link`, { cwd: process.cwd() });

if (existsSync('./package-lock.json')) {
	unlinkSync('./package-lock.json');
}
