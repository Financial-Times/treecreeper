const httpError = require('http-errors');
const getSchemaSubset = require('./lib/get-schema-subset');
const { readRecord, writeRestAPIQuery } = require('./lib/biz-ops-client');
const { formDataToRest, formDataToGraphQL } = require('./lib/data-conversion');
const response = require('./lib/response');
const template = require('./templates/edit-page');
const { handleError } = require('./lib/handle-error');

const displayForm = async (event, apiError) => {
	const { type, code } = event.params;
	const isCreate = /\/create/.test(event.path);
	let formData = {};

	console.log(event.body);
	// Persist any unsaved changes to form data stored in the event.body.
	if (apiError) {
		formData = await formDataToGraphQL(type, event.body);
		// If a code is present then fetch the record data to /edit
		// otherwise serve a blank /create form
	} else if (code) {
		formData = await readRecord(type, code, event.username);
	}

	const templateData = {
		schema: getSchemaSubset(event, type, false, isCreate),
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

	return response.page(template, templateData, event);
};

const handleForm = async event => {
	const { type } = event.params;
	let { code } = event.params;
	const formData = event.body;
	const clientUserId = event.username;
	// TODO If the form submit sends JSON rather than a string the parse step will not be needed
	const jsonFormData = formData;
	let mode = 'PATCH';
	// If a code is present then PATCH the existing record
	// otherwise POST the data to create a new item
	if (!code) {
		({ code } = jsonFormData);
		mode = 'POST';
	}
	try {
		await writeRestAPIQuery(
			type,
			code,
			formDataToRest(type, jsonFormData),
			mode,
			clientUserId,
		);
	} catch (err) {
		const error = {
			type,
			code,
			action: mode === 'POST' ? 'create' : 'update',
			message: err.message,
		};
		return displayForm(event, error);
	}

	return response.redirect(
		`/${type}/${encodeURIComponent(
			code,
		)}?message=${type} ${code} was successfully updated&messageType=success`,
	);
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
