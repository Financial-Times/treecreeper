const securityTests = (handler, namespacedCode, testBody = false) =>
	describe('security', () => {
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
		};

		Object.entries(attackVectors).forEach(([name, modifier]) => {
			it(`should error when ${name} is suspicious`, async () => {
				const input = {
					type: 'MainType',
					code: namespacedCode,
				};
				modifier(input);
				await expect(handler(input)).rejects.toThrow(
					expect.objectContaining({ status: 400 }),
				);
			});
		});
	});

module.exports = { securityTests };
