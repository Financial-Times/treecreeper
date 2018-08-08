const faker = require('faker');

const generateGroupData = () => {
	const relationshipType = ['HAS_TECH_DIRECTOR', 'PAYS_FOR'];
	const relationship = {
		HAS_TECH_DIRECTOR: { direction: 'outgoing', nodeType: 'Person' },
		PAYS_FOR: { direction: 'incoming', nodeType: 'CostCentre' },
		HAS_TEAM: { direction: 'outgoing', nodeType: 'Team' }
	};

	const generateDataArray = [];
	const length = 1500;

	for (let i = 0; i < length; i++) {
		const code = faker.lorem.word();
		const nodeCode = faker.lorem.word();

		const relationshipName =
			relationshipType[Math.floor(Math.random() * relationshipType.length)];

		generateDataArray.push({
			primaryNode: 'Group',
			code,
			url: `/v1/node/Group/${code}?upsert=true&relationshipAction=merge`,
			isActive: faker.random.boolean,
			relationshipName,
			direction: relationship[relationshipName].direction,
			nodeType: relationship[relationshipName].nodeType,
			nodeCode
		});
	}
	return generateDataArray;
};
generateGroupData();
module.exports = generateGroupData;
