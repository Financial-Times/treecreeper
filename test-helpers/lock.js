const lock = (client, ...fields) =>
	JSON.stringify(
		fields.reduce((obj, field) => ({ ...obj, [field]: client }), {}),
	);

module.exports = { lock };
