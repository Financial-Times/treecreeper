const httpError = require('http-errors');
const { getApiClient } = require('./lib/tc-ui-bridge');
const getSchemaSubset = require('./lib/get-schema-subset');
const { formDataToRest, formDataToGraphQL } = require('./lib/data-conversion');
const { handleError, renderPage } = require('./lib/renderer');
const template = require('./templates/edit-page');

const displayForm = async (event, apiError) => {
	const apiClient = getApiClient(event);
	const { type, code } = event.params;
	const isCreate = /\/create/.test(event.path);
	let formData = {};

	// Persist any unsaved changes to form data stored in the event.body.
	if (apiError) {
		formData = await formDataToGraphQL(type, event.body);
		// If a code is present then fetch the record data to /edit
		// otherwise serve a blank /create form
	} else if (code) {
		formData = await apiClient.read(type, code);
	}

	const templateData = {
		schema: getSchemaSubset(event, type, isCreate),
		data: formData,
		type,
		code,
		isEdit: !!code,
		pageType: 'edit',
		pageTitle: formData.code
			? `Edit ${type} ${formData.name}`
			: `New ${type}`,
	};

	if (apiError) {
		templateData.error = apiError;
	}

	return renderPage(template, templateData, event);
};

const handleForm = async event => {
	const apiClient = getApiClient(event);
	const { type } = event.params;
	let { code } = event.params;
	const formData = event.body;
	const jsonFormData = formData;
	let method = 'PATCH';
	// If a code is present then PATCH the existing record
	// otherwise POST the data to create a new item
	if (!code) {
		({ code } = jsonFormData);
		method = 'POST';
	}
	try {
		await apiClient.write(
			type,
			code,
			formDataToRest(type, jsonFormData),
			method,
		);
	} catch (err) {
		const error = {
			type,
			code,
			action: method === 'POST' ? 'create' : 'update',
			message: err.message,
		};
		return displayForm(event, error);
	}

	return {
		status: 303,
		headers: {
			location: `/${type}/${encodeURIComponent(
				code,
			)}?message=${type} ${code} was successfully updated&messageType=success`,
			'Cache-Control': 'max-age=0, private',
		},
	};
};

const render = async event => {
	if (event.method === 'GET') {
		return displayForm(event);
	}
	if (event.method === 'POST') {
		return handleForm(event);
	}
	throw httpError(405, 'Method Not Allowed');
};

const handler = handleError(render);

module.exports = {
	handler,
	render,
};
