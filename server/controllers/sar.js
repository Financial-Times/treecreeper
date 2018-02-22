const crud = require('./_crud');
const db = require('../db-connection');

const create = async (req, res) => {
	crud.create(res, 'SAR', 'id', req.body.sar.id, req.body.sar);

	for (let source of req.body.sources) {
		crud.create(res, 'Source', 'id', source.id, source, [
			{
				name:'CONSUMES',
				from: 'SAR',
				fromUniqueAttrName: 'id',
				fromUniqueAttrValue: req.body.sar.id,
				toUniqueAttrName: 'id',
				toUniqueAttrValue: source.id,
				to: 'Source',
			},
		]);
	}
};

const getWithSources = async (req, res) => {
	try {
		const sarQuery = `MATCH (sar { id: "${req.params.id}" }) RETURN sar`;
		const sourceQuery = `MATCH ({ id: "${req.params.id}" })-[:CONSUMES]->(sources) RETURN sources`;

		const sarResult = await db.run(sarQuery);
		const sourceResult = await db.run(sourceQuery);

		const formattedSources = sourceResult.records.reduce((acc, { _fields }) => [
			...acc,
			_fields.reduce((acc, { properties }) => ({
				...acc,
				...properties,
			}), {}),
		], []);

		const formattedSar = sarResult.records.reduce((acc, { _fields }) => ({
			...acc,
			..._fields.reduce((acc, { properties }) => ({
				...acc,
				...properties,
				sources: formattedSources,
			}), {}),
		}), {});

		return res.send(JSON.stringify(formattedSar));
	}
	catch (e) {
		console.log('[SAR] error', e);
		return res.status(500).end(e.toString());
	}
};

module.exports = { create, getWithSources };
