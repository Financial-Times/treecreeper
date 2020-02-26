/* global fetch */
const formatTotalCost = cost => {
	const GBPFormatter = new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return GBPFormatter.format(cost);
};

const resolveDocumentProperty = async ({ code }, args, context, info) => {
	if (!code) {
		throw new Error(
			'Must include code in body of query that requests any Document properties',
		);
	}
	const key = `${info.parentType.name}/${code}`;
	const record = await context.documentStoreDataLoader.load(key);
	return record[info.fieldName];
};

const resolveTCO = async parent => {
	const { code } = parent;
	const { TCO_API_URL: apiUrl, TCO_API_KEY: apiKey } = process.env;
	if (!code) {
		throw new Error(
			'Must include code in body of query that requests any Document properties',
		);
	}
	try {
		const response = await fetch(`${apiUrl}/${code}`, {
			headers: {
				'x-api-key': apiKey,
			},
		});

		if (response.ok) {
			const { aws, heroku } = await response.json();
			const totalAwsCost = aws.reduce((acc, { cost }) => acc + cost, 0);
			const totalHerokuCost = heroku.reduce(
				(acc, { cost }) => acc + cost,
				0,
			);
			const totalCost = totalAwsCost + totalHerokuCost;

			return {
				aws: {
					cost: totalAwsCost,
					formatted: formatTotalCost(totalAwsCost),
				},
				heroku: {
					cost: totalHerokuCost,
					formatted: formatTotalCost(totalHerokuCost),
				},
				totalCost: {
					cost: totalCost,
					formatted: formatTotalCost(totalCost),
				},
			};
		}
	} catch (error) {
		console.log(error);
	}

	return null;
};

module.exports = { resolveDocumentProperty, resolveTCO }
