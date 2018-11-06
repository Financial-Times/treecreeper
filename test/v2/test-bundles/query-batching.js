const { executeQuery } = require('../../../server/data/db-connection');
const { stubDbTransaction } = require('../helpers');

const getPayload = namespace => ({
	name: 'new-name',
	dependencies: [...Array(5)].map((item, n) => `${namespace}-system-${n}`),
	dependents: [`${namespace}-system-dependent`],
	dependentProducts: [`${namespace}-product-dependent`],
	supportedBy: `${namespace}-team-support`,
	deliveredBy: `${namespace}-team-delivery`,
	healthchecks: [...Array(5)].map((item, n) => `${namespace}-healthcheck-${n}`)
});

const sort = obj => {
	Object.entries(obj).forEach(([, val]) => {
		return Array.isArray(val) ? val.sort() : val;
	});
	return obj;
};

module.exports = ({ method, url, namespace, sandbox, app }) => {
	describe('query batching', () => {
		it('writes correctly and returns expected data', async () => {
			const payload = getPayload(namespace);
			// subtract 1 because of name property, which is not a relationship
			const relationshipCount =
				Object.values(payload).reduce(
					(total, prop) => total + (Array.isArray(prop) ? prop.length : 1),
					0
				) - 1;
			await sandbox
				.request(app)
				[method](url)
				.namespacedAuth()
				.send(payload)
				.expect(method === 'post' ? 200 : 201)
				.then(({ body }) =>
					expect(sort(body)).toEqual(
						sandbox.withCreateMeta(
							Object.assign(
								{
									code: `${namespace}-system`,
									monitoredBy: payload.healthchecks
								},
								payload
							)
						)
					)
				);

			const result = await executeQuery(
				`MATCH (n:System { code: "${namespace}-system" })-[r]-(c) RETURN n, r, c`
			);
			expect(result.records.length).toEqual(relationshipCount);
			expect(sandbox.stubSendEvent).toHaveBeenCalledTimes(15);
			// expect(sandbox.stubSendEvent).toHaveBeenCalledWith({
			// 	action: 'CREATE',
			// 	code: teamCode,
			// 	type: 'Team',
			// 	requestId,
			// 	clientId
			// });
			// console.log(sandbox.stubSendEvent.mock.calls);
			// const identifiers = state.stubSendEvent.args.map(
			// 	a =>
			// 		`${a[0].code}-${a[0].event}-${a[0].relationship &&
			// 			a[0].relationship.relType +
			// 				a[0].relationship.direction +
			// 				a[0].relationship.nodeCode}`
			// );
			// const uniqueIdentifiers = [...new Set(identifiers)];
			// // testing that each hcange only gets logged once
			// expect(state.stubSendEvent.args.length).to.equal(
			// 	uniqueIdentifiers.length
			// );
		});

		it('splits writes of many relationships into multiple calls', async () => {
			const dbTransactionStub = stubDbTransaction(sandbox);

			await sandbox
				.request(app)
				[method](url)
				.namespacedAuth()
				.send(getPayload(namespace))
				.then();

			const args = dbTransactionStub.args;
			if (args.length > 3) {
				// PATCH does a prefetch, which we discard
				args.shift();
			}
			expect(args.length).toBeGreaterThan(1);

			expect(args[0][0]).toMatch(method === 'post' ? /^CREATE/ : /^MERGE/);
			expect(args[1][0]).toMatch(/MERGE/);
		});
	});
};
