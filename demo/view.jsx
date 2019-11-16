const { h, render: renderJSX } = require('hyperons');
const fetch = require('node-fetch');
const schema = require('../packages/schema-sdk');

const primitiveComponents = require('../packages/ui-view-components');

const { getType } = require('../packages/schema-sdk');
const graphqlBuilder = require('./graphql-builder');

const fetchGraphQL = async (body, clientUserId, plain = false) => {
	const options = {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			'client-id': 'biz-ops-admin',
			'content-type': 'application/json',
		},
	};

	const response = await fetch(
		`http://local.in.ft.com:8888/graphql`,
		options,
	);

	const json = await response.json();

	return json.data;
};

const readRecord = async (type, code) => {
	getType(type);

	return fetchGraphQL({
		query: graphqlBuilder(type),
		variables: { itemId: code },
	}).then(graphqlData => graphqlData[type]);
};

const getPrimitiveComponent = ({ type, isRelationship, hasMany }) => {
	if (isRelationship) {
		if (hasMany) {
			return primitiveComponents.BizOpsLinks;
		}
		return primitiveComponents.BizOpsLink;
	}
	return primitiveComponents[type] || primitiveComponents.Default;
};

const Properties = ({ fields, data }) => {
	const propertyfields = Object.entries(fields);
	console.log(data);
	return propertyfields.map(([name, def]) => {
		const viewModel = {
			value: data[name],
			id: name,
			...def,
		};
		const PrimitiveComponent = getPrimitiveComponent(viewModel);

		return (
			<div>
				<span>{viewModel.label}:</span>
				<PrimitiveComponent {...viewModel} />
			</div>
		);
	});
};

exports.handler = async (req, res) => {
	const { properties } = schema.getType('MainType');
	const data = await readRecord('MainType', 'main');

	res.send(`
	<!DOCTYPE html>
	<html>
	<body>
	${renderJSX(
		<main className="o-layout__main">
			<div className="o-layout-typography">
				<Properties fields={properties} data={data} />
			</div>
		</main>,
	)}</body></html>`);
};
