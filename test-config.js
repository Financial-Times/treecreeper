const chai = require('chai');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

require('babel-polyfill');
require('babel-register')({
	presets: [require.resolve('babel-preset-env')],
});
