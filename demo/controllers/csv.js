
const fetch = require('node-fetch');
const { parse } = require('json2csv');

const collapseTree = (input) => {
	const keys = new Set();

	const recursor = (obj, prefix) => {
		if (Array.isArray(obj)) {
			return obj.flatMap(item => recursor(item, prefix))
		}

		if (prefix) {
			obj = Object.fromEntries(Object.entries(obj).map(([key, val]) => {
				return [`${prefix}.${key}`, val]
			}))
		}

		const arrayEntries = Object.entries(obj).filter(([key, val]) => Array.isArray(val))

		if (arrayEntries.length > 1) {
			throw new Error('More than one thing to spread - need a higher dimensional brain')
		}

		const newObj = {}
		let newArray;

		Object.entries(obj).forEach(([key, val]) => {
			if (Array.isArray(val)) {
				if (val.length > 0) {
					newArray = recursor(val, key);
				}
			} else if (typeof val === 'object' && val !== null) {
				Object.assign(newObj, recursor(val, key))
			} else {
				keys.add(key)
				newObj[key] = val;
			}
		})
		if (newArray) {
			newArray = newArray.map(entry => ({...entry, ...newObj}))
		}
		return newArray || newObj;

	}

	const flattened = recursor(input);

	return {flattened, keys: [...keys]}
}


module.exports = async (req, res) => {
	try {
	const {data} = await fetch('http://local.in.ft.com:8888/api/graphql', {
		method: 'post',
		body: JSON.stringify(req.query),
		headers: {
			'client-id': 'csv',
			'content-type': 'application/json'
		}
	}).then(res => res.json())

	const {flattened, keys} = collapseTree(data);


	const opts = { fields: keys };

	const csv = parse(flattened, opts);

	res.send(csv)
} catch (e) {
	res.send(e.toString())
}
}


// forEach prop
// - if flat do nothing
// - if object change names to include path and flatten all
// - if array
