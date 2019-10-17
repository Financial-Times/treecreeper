/* global expect */
const {
	convertNeo4jToJson,
} = require('../packages/api-rest-handlers/lib/neo4j-type-conversion');
const { driver } = require('./db-connection');

const executeQuery = (query, parameters) =>
	driver.session().run(query, parameters);

const neo4jTest = (type, code) => {
	const result = executeQuery(
		`MATCH (node:${type} { code: "${code}" })
			WITH node
			OPTIONAL MATCH (node)-[rel]-(relatedNode)
		RETURN node, rel, relatedNode`,
	);

	const tests = [];

	const test = func =>
		tests.push(result.then(({ records }) => func(records)));

	return {
		exists() {
			test(records => expect(records.length));
			return this;
		},
		notExists() {
			test(records => expect(records.length).toBe(0));
			return this;
		},
		match(props) {
			test(records =>
				expect(
					convertNeo4jToJson(records[0].get('node').properties),
				).toMatchObject(props),
			);
			return this;
		},
		notMatch(props) {
			test(records =>
				expect(
					convertNeo4jToJson(records[0].get('node').properties),
				).not.toMatchObject(props),
			);
			return this;
		},
		noRels() {
			test(records => expect(records.length).toBe(1));
			return this;
		},

		hasRels(n) {
			test(records => expect(records.length).toBe(n));
			return this;
		},
		hasRel(
			{ type: relType, props: relationshipProps, direction },
			{ type: relatedType, props: relatedNodeProps },
		) {
			test(records => {
				const record = records.find(testRecord => {
					const relatedNode = testRecord.get('relatedNode');
					const rel = testRecord.get('rel');
					return (
						rel.type === relType &&
						relatedNode.labels[0] === relatedType &&
						relatedNode.properties.code === relatedNodeProps.code &&
						// need either both things indicate outgoing, or both incoming
						// i.e. both true or both false
						(direction === 'outgoing') ===
							(rel.end === relatedNode.identity)
					);
				});
				expect(record).not.toBeUndefined();
				relationshipProps = Array.isArray(relationshipProps)
					? relationshipProps
					: [relationshipProps];
				relationshipProps.forEach(rp =>
					expect(
						convertNeo4jToJson(record.get('rel').properties),
					).toMatchObject(rp),
				);
				relatedNodeProps = Array.isArray(relatedNodeProps)
					? relatedNodeProps
					: [relatedNodeProps];
				relatedNodeProps.forEach(rp =>
					expect(
						convertNeo4jToJson(
							record.get('relatedNode').properties,
						),
					).toMatchObject(rp),
				);
			});
			return this;
		},
		then: res => res(Promise.all(tests)),
	};
};

module.exports = { neo4jTest };
