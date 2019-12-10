const { getType } = require('@financial-times/tc-schema-sdk');
const fetch = require('node-fetch');

const autocomplete = async (req, res) => {
	const { field, type } = req.params;
	const { q, propertyName, parentType } = req.query;

	const targetType = getType(type);

	const query =
		field in targetType.properties
			? `OR: [
					{code_contains: "${q}"},
					{name_contains: "${q}"}
				]`
			: `code_contains: "${q}"`;

	let inactiveQuery = '';
	if (parentType) {
		const rootType = getType(parentType);
		if (rootType.properties[propertyName].addInactive === false) {
			let { inactiveRule } = targetType;
			if (!inactiveRule && 'isActive' in targetType.properties) {
				inactiveRule = { isActive: false };
			}
			if (!inactiveRule) return;

			let ruleVal = Object.values(inactiveRule)[0];

			if (typeof ruleVal === 'string') {
				ruleVal = `"${ruleVal}"`;
			}
			inactiveQuery = `, ${Object.keys(inactiveRule)[0]}: ${ruleVal}`;
		}
	}

	const graphQlQuery = `{
		${targetType.pluralName} (
			filter: {
				${query}
				${inactiveQuery}
			}

		){
			code
			${field in targetType.properties ? field : ''}
		}
	}`;

	return fetch('http://local.in.ft.com:8888/api/graphql', {
		method: 'post',
		body: JSON.stringify({
			query: graphQlQuery,
		}),

		headers: {
			'client-id': 'rhys',
			'content-type': 'application/json',
		},
	})
		.then(async response => {
			if (!response.ok) {
				const m = await response.text();
				throw new Error(m);
			}
			return response.json();
		})
		.then(results => res.json(results.data[targetType.pluralName]))
		.catch(error => {
			res.send(error).end();
		});
};

module.exports = { autocomplete };
