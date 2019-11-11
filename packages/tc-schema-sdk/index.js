const { SDK } = require('./sdk');
const readYaml = require('./lib/read-yaml');
const primitiveTypesMap = require('./lib/primitive-types-map');

module.exports = new SDK({ init: false });

module.exports.SDK = SDK;
module.exports.readYaml = readYaml;
module.exports.primitiveTypesMap = primitiveTypesMap;
