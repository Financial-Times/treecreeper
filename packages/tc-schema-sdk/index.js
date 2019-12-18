const { SDK } = require('./sdk');
const readYaml = require('./lib/read-yaml');

module.exports = new SDK({ init: false });

module.exports.SDK = SDK;
module.exports.readYaml = readYaml;
