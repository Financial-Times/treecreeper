const { SDK } = require('@financial-times/tc-schema-sdk');

const sdk = new SDK();
sdk.init();

module.exports = sdk;
