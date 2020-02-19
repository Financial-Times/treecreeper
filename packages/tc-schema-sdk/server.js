const { SDK } = require('./sdk');
SDK.prototype.readYaml = require('./lib/read-yaml');

module.exports = new SDK({ init: false });
module.exports.SDK = SDK;
