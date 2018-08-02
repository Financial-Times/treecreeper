const fs = require('fs');
const generateSystemData = require('./system');
const generateGroupData = require('./group');
const generateTeamData = require('./team');

const exportToCSV = () => {
	[generateSystemData(), generateGroupData(), generateTeamData()].map(array => {
		const header = Object.keys(array[0]).join(',');
		const data = array.map(object => {
			return Object.values(object).join(',');
		});
		const dataToCSV = [header, ...data].join('\n');
		const nodeType = array[0].primaryNode.toLowerCase();
		const fileName = `scripts/load-testing/lib/exportToCSV/${nodeType}.csv`;
		fs.existsSync(fileName)
			? console.log('file already exists')
			: fs.writeFile(fileName, dataToCSV, err => {
					if (err) throw err;
			  });
	});
};

exportToCSV();
module.exports = exportToCSV;
