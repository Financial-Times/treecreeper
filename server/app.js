'use strict';

const express = require('express');
const logger = require('@financial-times/n-logger').default;
const { ui, api } = require('./routes');
const init = require('../scripts/init');

const app = express();

app.set('case sensitive routing', true);

if (process.env.NODE_ENV !== 'production') {
	app.get('/init', init);
}

app.use('/api', api(express.Router()));
app.use('/', ui(express.Router()));

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	logger.info(`Listening on ${PORT}`);
});

module.exports = app;
