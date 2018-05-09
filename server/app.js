'use strict';

const express = require('express');
const logger = require('@financial-times/n-logger').default;
const { ui, api } = require('./routes');
const init = require('../scripts/init');

const createApp = () => {
    const app = express();

    app.set('case sensitive routing', true);

    if (process.env.NODE_ENV !== 'production') {
        app.get('/init', init);
    }

    app.use('/api', api(express.Router()));
    app.use('/', ui(express.Router()));

	app.use((error, request, response, next) => {
		logger.error(error);
		next(error);
	})

    return app;
};

if (require.main === module) {
	const PORT = process.env.PORT || 8888;

	createApp().listen(PORT, () => {
        logger.info(`Listening on ${PORT}`);
    });
}

module.exports = createApp;
