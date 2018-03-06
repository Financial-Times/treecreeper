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
			const completeSources = sources.reduce((acc, { status }) =>
				status === 'COMPLETE'
					? acc + 1
					: acc
				, 0);

			const allEmpty = sources.every(({ status}) => status === 'EMPTY');

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
}

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
