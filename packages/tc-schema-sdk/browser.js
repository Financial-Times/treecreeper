const { SDK } = require('./sdk');

module.exports = new SDK({ init: false });

module.exports.SDK = SDK;
