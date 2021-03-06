/* global expect */

/* eslint-disable import/no-extraneous-dependencies */
const {
	convertNeo4jToJson,
} = require('@financial-times/tc-api-rest-handlers/lib/neo4j-type-conversion');
/* eslint-enable import/no-extraneous-dependencies */
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
		notHave(props) {
			test(records => {
				const neo4jNodeProps = convertNeo4jToJson(
					records[0].get('node').properties,
				);
				const notExistentProps = Array.isArray(props) ? props : [props];
				notExistentProps.forEach(prop =>
					expect(neo4jNodeProps[prop]).not.toBeTruthy(),
				);
			});
			return this;
		},
		noRels() {
			test(records =>
				expect(
					records
						.map(record => record.get('rel'))
						.filter(rel => !!rel).length,
				).toBe(0),
			);
			return this;
		},

		hasRels(n) {
			test(records =>
				expect(
					records
						.map(record => record.get('rel'))
						.filter(rel => !!rel).length,
				).toBe(n),
			);
			return this;
		},
		hasRel(
			{
				type: relType,
				props: relationshipProps,
				direction,
				notProps: nonExistentRelProps,
			},
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
				const neo4jRelProps = convertNeo4jToJson(
					record.get('rel').properties,
				);
				relationshipProps = Array.isArray(relationshipProps)
					? relationshipProps
					: [relationshipProps];
				relationshipProps.forEach(rp =>
					expect(neo4jRelProps).toMatchObject(rp),
				);
				if (nonExistentRelProps) {
					nonExistentRelProps = Array.isArray(nonExistentRelProps)
						? nonExistentRelProps
						: [nonExistentRelProps];
					nonExistentRelProps.forEach(nrp =>
						expect(neo4jRelProps[nrp]).not.toBeTruthy(),
					);
				}
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
