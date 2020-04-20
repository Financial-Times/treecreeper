const httpError = require('http-errors');
const template = require('./template');

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
console.log('55555 event', JSON.stringify(event, null,2))
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
console.log('66666 formData: ', JSON.stringify(formData, null,4))
		const templateData = {
			...getSchemaSubset(event, type, isCreate),
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
console.log('77777 templateData: ', JSON.stringify(templateData, null,2))
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

		if (formData.DecomOverride) { // either this or the override component uses the original lifecycle stage key
			formData.lifecycleStage = 'Decommissioned';
			// delete formData.DecomOverride;
		}
		let method = 'PATCH';
		// If a code is present in the url/event then PATCH the existing record
		// otherwise POST the data to create a new item
		if (!code) {
			({ code } = formData);
			method = 'POST';
		}
		try {
			console.log('09090909 type', type)
			console.log('09090909 code', code)
			const fdtr = formDataToRest(type, formData);
			console.log('0909090', JSON.stringify(fdtr, null, 2))
			console.log('09090909 method', method)
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
			console.log('1212121 error', error)
			return displayForm(event, error);
		}
console.log('9999 method', method)
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
			console.log('88888 POST')
			return handleForm(event);
		}
		throw httpError(405, 'Method Not Allowed');
	};

	return { handler: handleError(render) };
};

module.exports = {
	getEditHandler,
};
