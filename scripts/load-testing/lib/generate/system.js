const faker = require('faker');

const generateSystemData = () => {
	const serviceTier = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Unsupported'];
	const lifecycleStage = [
		'Preproduction',
		'Production',
		'Dormant',
		'Decommissioned'
	];
	const relationshipType = [
		'SUPPORTED_BY',
		'DEPENDS_ON',
		'HAS_REPO',
		'MONITORED_BY',
		'DELIVERED_BY',
		'HAS_STAKEHOLDER'
	];

	const relationship = {
		SUPPORTED_BY: { direction: 'outgoing', nodeType: 'Team' },
		DEPENDS_ON: { direction: 'incoming', nodeType: 'Product' },
		HAS_REPO: { direction: 'outgoing', nodeType: 'Repository' },
		MONITORED_BY: { direction: 'outgoing', nodeType: 'Healthcheck' },
		DELIVERED_BY: { direction: 'outgoing', nodeType: 'Team' },
		HAS_STAKEHOLDER: { direction: 'outgoing', nodeType: 'Person' },
		KNOWN_ABOUT_BY: { direction: 'outgoing', nodeType: 'Person' },
		STORED_IN: { direction: 'incoming', nodeType: 'Repository' }
	};

	const generateDataArray = [];
	const length = 1500;

	for (let i = 0; i < length; i++) {
		const code = faker.lorem.word();
		const nodeCode = faker.lorem.word();

		const relationshipName =
			relationshipType[Math.floor(Math.random() * relationshipType.length)];
		generateDataArray.push({
			primaryNode: 'System',
			code,
			url: `/v1/node/System/${code}?upsert=true&relationshipAction=merge`,
			serviceTier: serviceTier[Math.floor(Math.random() * serviceTier.length)],
			lifecyclestage:
				lifecycleStage[Math.floor(Math.random() * lifecycleStage.length)],
			relationshipName,
			direction: relationship[relationshipName].direction,
			nodeType: relationship[relationshipName].nodeType,
			nodeCode:
				relationship[relationshipName].nodeType === 'Repository'
					? `github:Financial-Times/${nodeCode}`
					: nodeCode
		});
	}

	return generateDataArray;
};

module.exports = generateSystemData;
