require('babel-polyfill');
require('babel-core/register')({
	presets: [require.resolve('babel-preset-env')],
});
