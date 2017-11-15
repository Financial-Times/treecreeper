const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const security = require('./middleware/security');
const checks = require('./lib/checks');
const saveNode = require('./controllers/saveNode');
const deleteNode = require('./controllers/deleteNode');

const app = express();

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.use(bodyParser.json());
app.use(security);

app.all('/api/node/:nodeType', checks.checkNodeType);

app.post('/api/node/:nodeType', saveNode);

app.delete('/api/node/:nodeType', deleteNode);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
	logger.info(`Listening on ${PORT}`);
});

module.exports = app;
