const crud = require('./_crud');
const db = require('../db-connection');

const create = async (req, res) => {

	crud.create(res, 'SAR', 'id', req.body.sar.id, req.body.sar);

	for (let brand of req.body.brands) {

		const brandNode = {
			id: brand.id,
			name: brand.name,
			status: brand.status,
		};

		crud.create(res, 'Brand', 'id', brandNode.id, brandNode, [
			{
				name:'CONNECTED_TO',
				from: 'SAR',
				fromUniqueAttrName: 'id',
				fromUniqueAttrValue: req.body.sar.id,
				toUniqueAttrName: 'id',
				toUniqueAttrValue: brandObj.id,
				to: 'Brand',
			},
		]);

		for (let system of brand.systems) {
			crud.create(res, 'System', 'id', system.id, system, [
				{
					name:'HAS',
					from: 'Brand',
					fromUniqueAttrName: 'id',
					fromUniqueAttrValue: brand.id,
					toUniqueAttrName: 'id',
					toUniqueAttrValue: system.id,
					to: 'System',
				},
			]);
		}
	}
};

const get = async (req, res) => {
	try {
		const query = `
			MATCH (sar:SAR)-[:CONSUMES]->(sources)
			WITH sar, collect(sources) as allSources
			RETURN sar{ .*, sources: allSources }
		`;
		const result = await db.run(query);

		const formattedResult = result.records.reduce((acc, { _fields }) => {
			const { sources } = _fields[0];

			const completeSources = sources.reduce((acc, { properties: { status } }) =>
				status === 'COMPLETE'
					? acc + 1
					: acc
				, 0);

			const allEmpty = sources.every(({ properties: { status } }) => status === 'EMPTY');

			return [
				...acc,
				Object.assign(
					{},
					_fields[0],
					{
						sources: {
							complete: completeSources,
							total: sources.length,
							allEmpty,
						},
					},
				),
			];
		}, []);

		return res.send(JSON.stringify(formattedResult));
	}
	catch (e) {
		console.log('[SAR] error', e);
		return res.status(500).end(e.toString());
	}
};

const getWithSources = async (req, res) => {
	try {
		const query = `
			MATCH (sar { id: "${req.params.id}" })-[:CONSUMES]->(sources)
			RETURN { sar: sar, sources: collect(sources) }
		`;
		const result = await db.run(query);

		if (result.records.length === 0) {
			return res.status(404).end(`SAR ${req.params.id} does not exist`);
		}

		const { sar: { properties: sar }, sources } = result.records[0]._fields[0];
		const formattedResult = Object.assign({},
			sar,
			{
				sources: sources.map(({ properties }) => properties),
			}
		);

		return res.send(JSON.stringify(formattedResult));
	}
	catch (e) {
		console.log('[SAR] error', e);
		return res.status(500).end(e.toString());
	}
};

module.exports = { create, get, getWithSources };
