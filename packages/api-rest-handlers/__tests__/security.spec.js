const { setupMocks } = require('../../../test-helpers');
const { getHandler } = require('../get');
const { deleteHandler } = require('../delete');
const { postHandler } = require('../post');
const { patchHandler } = require('../patch');
// const { absorbHandler } = require('../absorb');

// Example cypher query taken from https://stackoverflow.com/a/24317293/10917765
const INJECTION_ATTACK_STRING =
	'"1 WITH count(1) AS dummy MATCH (u:User) OPTIONAL MATCH (u)-[r]-() DELETE u, r"';

const attackVectors = {
	type: obj => {
		obj.type = INJECTION_ATTACK_STRING;
	},
	code: obj => {
		obj.code = INJECTION_ATTACK_STRING;
	},
	clientId: obj => {
		obj.metadata = { clientId: INJECTION_ATTACK_STRING };
	},
	clientUserId: obj => {
		obj.metadata = { clientUserId: INJECTION_ATTACK_STRING };
	},
	requestId: obj => {
		obj.metadata = { requestId: INJECTION_ATTACK_STRING };
	},
	// propertyValue: obj => {
	// 	obj.body = {
	// 		someString: INJECTION_ATTACK_STRING,
	// 	};
	// },
	propertyName: obj => {
		obj.body = {
			[INJECTION_ATTACK_STRING]: 'value',
		};
	},
	relatedCode: obj => {
		obj.body = {
			children: [INJECTION_ATTACK_STRING],
		};
	},
};

describe('rest security', () => {
	const namespace = 'api-rest-handlers-security';
	const mainCode = `${namespace}-main`;

	setupMocks(namespace);

	[
		['get', getHandler()],
		['delete', deleteHandler()],
		['post', postHandler()],
		['patch', patchHandler()],
		// ['absorb', absorbHandler()]
	].forEach(([handlerName, handler]) => {
		/* eslint-disable jest/valid-describe */
		describe(handlerName, () => {
			/* eslint-enable jest/valid-describe */
			Object.entries(attackVectors).forEach(([name, modifier]) => {
				it(`should error when ${name} is suspicious`, async () => {
					const input = {
						type: 'MainType',
						code: mainCode,
					};
					modifier(input);
					await expect(handler(input)).rejects.toThrow(
						expect.objectContaining({ status: 400 }),
					);
				});
			});
		});
	});
});
