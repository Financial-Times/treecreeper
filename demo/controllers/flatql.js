
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

	const table = recursor(input);

	return {table, keys: [...keys]}
}


const nonVariableKeys = ['format', 'sparse', 'query']

const cleanQuery = query => {
	const newQuery = {...query};
	nonVariableKeys.forEach(key => {
		delete newQuery[key]
	})
	return newQuery
}

module.exports = async (req, res) => {
	try {
	const {data} = await fetch('http://local.in.ft.com:8888/api/graphql', {
		method: 'post',
		body: JSON.stringify({
			query: req.query.query,
			variables: cleanQuery(req.query)
		}),
		headers: {
			'client-id': 'csv',
			'content-type': 'application/json'
		}
	}).then(res => res.json())


	const tables = Object.entries(data).map(([name, tree]) => ({name, ...collapseTree(tree, req.query)}));

	const {format = 'json'} = req.query;

	if (format === 'json') {
		res.set('content-type', 'application/json')
		res.send(tables)
	} else if (format === 'csv') {
		const csvs = tables.map(({table, keys}) => parse(table, { fields: keys }));
		res.set('content-type', 'text/csv')
		res.send(csvs.join('\n\n'))
	} else if (format === 'ascii') {
		const asciis = tables.map(({table, name, keys}) => {
			const ascii = new AsciiTable(name)
			ascii
			  .setHeading(...keys)

			  table.forEach(row => {
			  	ascii.addRow(...keys.map(key => key in row ? row[key] : ''))
			  })
		  return ascii.toString()
		})
		res.send('<pre>' + asciis.join('\n\n') + '</pre>')
	}
} catch (e) {
	console.log(e)
	res.send(e.toString())
}
}

//http://local.in.ft.com:8888/flatql?team=reliability-engineering&query=query%20data($team:%20String!%20){%20Products(filter:%20{%20deliveredBy:%20{%20code:%20$team%20}%20})%20{%20code%20comprisedOfSystems%20{%20code%20}%20}%20OrphanedSystems:%20Systems(%20filter:%20{%20deliveredBy:%20{%20code:%20$team%20}%20componentPartOfProducts:%20null%20lifecycleStage_not:%20Decommissioned%20}%20)%20{%20code%20}%20}&format=ascii&sparse=true



// {
//   Groups (filter: {
//     department: {
//       code: "product-technology"
//     }
//   }){
//     name
//   teams(filter: {
//     delivers_some: {
//       lifecycleStage_not: Decommissioned
//       _lockedFields_contains:"runbook-md"
//     }
//   } ){
//     name
//     delivers (filter:{
//       lifecycleStage_not: Decommissioned
//       _lockedFields_contains:"runbook-md"
//     }){
//       code
//     }
//   }
//   }
// }
