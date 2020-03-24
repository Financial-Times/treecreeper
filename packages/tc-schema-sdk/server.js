const { SDK } = require('./sdk');
SDK.prototype.readYaml = require('./lib/read-yaml');

module.exports = new SDK();
module.exports.SDK = SDK;
