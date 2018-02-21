const crud = require('./_crud');

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

module.exports = { create };
