const rawData = require('../lib/raw-data')
const cache = require('../lib/cache')
const {byNodeType} = require('../lib/construct-relationships')

module.exports.method = (typeName = undefined, direction = undefined) => {
	return byNodeType(rawData.getRelationships())[typeName]
}
