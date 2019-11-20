const { join, normalize } = require('path');
const { existsSync, readdirSync } = require('fs');
const { spawnSync } = require('child_process');

const root = join(__dirname, '../packages');
readdirSync(root)
	.map(pkg => join(root, pkg))
	.filter(pkg => existsSync(join(pkg, 'package.json')))
	.map(pkg => normalize(pkg))
	.forEach(pkg => {
		console.log(`installing packages for ${pkg}`);
		const result = spawnSync('npm', ['install', '--no-package-lock'], {
			cwd: pkg,
			stdio: 'pipe',
			encoding: 'utf8',
			shell: true,
		});
		console.log(result.stdout);
	});
