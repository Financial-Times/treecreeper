const { getApp } = require('../packages/api-express');

const PORT = process.env.PORT || 8888;

getApp().then(app => {
	app.listen(PORT, () => {
		app.logger(`Listening on ${PORT}`);
	});
});
