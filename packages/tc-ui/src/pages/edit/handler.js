const { getType } = require('@financial-times/tc-schema-sdk');
const httpError = require('http-errors');
const template = require('./template');

const getClientSideRecord = (type, formData) => {
	const { properties } = getType(type);
	/**
	 * Sending the entire record to the client multiple times can increase the payload immensely
	 * However some components rely on this (eg "decommissioned" functionality)
	 * As a workaround for now, truncate long text fields
	 * TODO: think of a better way to be selective about what we send
	 */
	const clientSideRecord = { ...formData };

	Object.entries(properties)
		// HACK Document has a weird status in that it's not part of the tc primitive types
		// and yet we have an entire sublibrary - tc-api-document-store - built around the
		// notion of having documents. So it feels a litte dirty, but probably ok, to use
		// it here
		// We check for fields
		.filter(([key]) => formData[key] && properties[key].type === 'Document')
		.forEach(([key]) => {
			clientSideRecord[key] = `${formData[key].substring(0, 24)}…`;
		});

	return clientSideRecord;
};

const getEditHandler = ({
	getApiClient,
	getSchemaSubset,
	handleError,
	renderPage,
	assignComponent,
	formDataToRest,
	formDataToGraphQL,
}) => {
	const displayForm = async (event, apiError) => {
		const apiClient = getApiClient(event);
		const { type, code } = event;
		const isCreate = !code;

		let formData;

		if (apiError) {
			// Persist any unsaved changes to form data stored in the event.body.
			formData = await formDataToGraphQL(type, event.body);
		} else if (code) {
			// If a code is present then fetch the record data to /edit
			formData = await apiClient.read(type, code);
		} else {
			// otherwise serve a blank /create form
			formData = {};
		}

		const templateData = {
			...getSchemaSubset(event, type, isCreate),
			clientSideRecord: getClientSideRecord(type, formData),
			data: formData,
			type,
			code,
			assignComponent,
			isEdit: !!code,
			pageType: 'edit',
			pageTitle: formData.code
				? `Edit ${type} ${formData.name}`
				: `New ${type}`,
		};

		if (apiError) {
			templateData.error = apiError;
		}

		return renderPage({ template, data: templateData, event });
	};

	const handleForm = async event => {
		const apiClient = getApiClient(event);
		const { type } = event;
		let { code } = event;
		const formData = event.body;
		let method = 'PATCH';
		// If a code is present in the url/event then PATCH the existing record
		// otherwise POST the data to create a new item
		if (!code) {
			({ code } = formData);
			method = 'POST';
		}
		try {
			await apiClient.write(
				type,
				code,
				formDataToRest(type, formData),
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

	return { handler: handleError(render) };
};

module.exports = {
	getEditHandler,
};
