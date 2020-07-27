
const fetch = require('node-fetch');
const { parse } = require('json2csv');
const AsciiTable = require('ascii-table')
const collapseTree = (input, {sparse = false} = {}) => {
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

		const newObj = {}
		let newArray;

		const assignNewArray = arr => {
			if (newArray) {
				throw new Error('More than one thing to spread - need a higher dimensional brain')
			}
			newArray = arr;
		}

		Object.entries(obj).forEach(([key, val]) => {
			if (Array.isArray(val)) {
				if (val.length > 0) {
					assignNewArray(recursor(val, key));
				}
			} else if (typeof val === 'object' && val !== null) {
				const newVal = recursor(val, key);
				if (Array.isArray(newVal)) {
					assignNewArray(newVal);
				} else {
					Object.assign(newObj, recursor(val, key))
				}
			} else {
				keys.add(key)
				newObj[key] = val;
			}
		})
		if (newArray) {
			if (sparse) {
				Object.assign(newArray[0], newObj)
			} else {
				newArray = newArray.map(entry => ({...entry, ...newObj}))
			}
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

	const {flattened, keys} = collapseTree(data, req.query);


	const opts = { fields: keys };
	const {format = 'json'} = req.query;
	if (format === 'json') {
		res.set('content-type', 'application/json')
		res.send(flattened)
	} else if (format === 'csv') {
		const csv = parse(flattened, opts);
		res.set('content-type', 'text/csv')
		res.send(csv)
	} else if (format === 'ascii') {
		const ascii = new AsciiTable(req.query.query)
		ascii
		  .setHeading(...keys)

		  flattened.forEach(row => {
		  	ascii.addRow(...keys.map(key => key in row ? row[key] : ''))
		  })
		res.send('<pre>' + ascii.toString() + '</pre>')
	}
} catch (e) {
	res.send(e.toString())
}
}


// http://local.in.ft.com:8888/flatql?query={%20Products%20(filter:{%20deliveredBy:{code:%22reliability-engineering%22}%20})%20{%20code%20comprisedOfSystems%20{%20code%20}%20}%20}&sparse=true
// http://local.in.ft.com:8888/flatql?query={%20Systems%20(filter:{%20deliveredBy:{code:%22reliability-engineering%22}%20componentPartOfProducts:null%20lifecycleStage_not:Decommissioned%20})%20{%20code%20}%20}&sparse=true
