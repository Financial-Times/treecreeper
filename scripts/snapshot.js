fetch = require('isomorphic-fetch');

const snapshotUrl = `https://api.graphenedb.com/v1/databases/${process.env.DB_ID}/snapshot`;

const run = async () => {

	const response = await fetch (snapshotUrl, {
		method: 'PUT',
		headers: {
			api_key: process.env.SNAPSHOT_API_KEY,
		}
	});

	if (response.status === 200) {
		const body = await response.json();
		console.log(body);
		return;
	}

	console.log(await response.text());
};

run();