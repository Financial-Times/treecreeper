const faker = require('faker');

const generateGroupData = () => {
	const isActive = ['true', 'false'];
	const relationshipType = ['HAS_TECH_DIRECTOR', 'PAYS_FOR'];
	const relationship = {
		HAS_TECH_DIRECTOR: { direction: 'outgoing', nodeType: 'Person' },
		PAYS_FOR: { direction: 'incoming', nodeType: 'CostCentre' }
	};

	const generateDataArray = [];
	const length = 100;

	for (let i = 0; i < length; i++) {
		const code = faker.lorem.word();
		const nodeCode = faker.lorem.word();

		const relationshipName =
			relationshipType[Math.floor(Math.random() * relationshipType.length)];

		generateDataArray.push({
			primaryNode: 'Group',
			code,
			url: `/v1/node/Group/${code}?upsert=true`,
			isActive: isActive[Math.floor(Math.random() * isActive.length)],
			relationshipName,
			direction: relationship[relationshipName].direction,
			nodeType: relationship[relationshipName].nodeType,
			nodeCode
		});
	}
	return generateDataArray;
};

module.exports = generateGroupData;
