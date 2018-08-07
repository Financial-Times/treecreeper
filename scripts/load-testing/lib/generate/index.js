const fs = require('fs');
const generateSystemData = require('./system');
const generateGroupData = require('./group');
const generateTeamData = require('./team');

const generateData = {
	System: generateSystemData(),
	Group: generateGroupData(),
	Team: generateTeamData()
};

const exportToCSV = () => {
	['System', 'Group', 'Team'].map(nodeType => {
		const fileName = `scripts/load-testing/lib/exportToCSV/${nodeType}.csv`;
		if (fs.existsSync(fileName)) {
			console.log('file already exists');
		} else {
			const array = generateData[nodeType];
			const header = Object.keys(array[0]).join(',');
			const data = array.map(object => {
				return Object.values(object).join(',');
			});
			const dataToCSV = [header, ...data].join('\n');
			fs.writeFileSync(fileName, dataToCSV, err => {
				if (err) throw err;
			});
		}
	});
};
exportToCSV();
