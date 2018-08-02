const faker = require('faker');

const generateTeamData = () => {

	const relationshipType = ['HAS_PRODUCT_OWNER', 'HAS_TEAM', 'HAS_TECH_LEAD'];
	const relationship = {
		HAS_PRODUCT_OWNER: { direction: 'outgoing', nodeType: 'Person' },
		HAS_TEAM: { direction: 'outgoing', nodeType: 'Team' },
		HAS_TECH_LEAD: { direction: 'outgoing', nodeType: 'Person' }
	};

	const generateDataArray = [];
	const length = 100;

	for (let i = 0; i < length; i++) {
		const code = faker.lorem.word();
		const nodeCode = faker.lorem.word();
		const relationshipName =
			relationshipType[Math.floor(Math.random() * relationshipType.length)];
		generateDataArray.push({
			primaryNode: 'Team',
			code,
			contactType: 'team',
			url: `/v1/node/Team/${code}?upsert=true`,
			isThirdParty:
				faker.random.boolean,
			isActive: faker.random.boolean,
			email: `${code}-tech@lt.com`,
			slack: `lt-${code}`,
			relationshipName,
			direction: relationship[relationshipName].direction,
			nodeType: relationship[relationshipName].nodeType,
			nodeCode
		});
	}
	return generateDataArray;
};

module.exports = generateTeamData;
