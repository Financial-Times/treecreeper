const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const security = require('./middleware/security');
// const checks = require('./lib/checks');
const supplier = require('./controllers/supplier');
const survey = require('./controllers/survey');
const contract = require('./controllers/contract');
const submission = require('./controllers/submission');
const crud = require('./controllers/_crud');

const app = express();

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.use(bodyParser.json());
app.use(security);

app.get('/', (req, res) => {
	res.send('biz op api');
});

// supplier
app.get('/api/suppliers/', supplier.getAll);

// contract
app.get('/api/contracts/:supplierId', contract.get);

// submission
app.get('/api/submission/:id', submission.get);
app.get('/api/submissions/:contractId/:surveyId', submission.getAllforOne);
app.post('/api/submission/', submission.create);
app.put('/api/submission/:id/:surveyId', submission.update);
app.delete('/api/submission/:id', submission.remove);

// survey
app.get('/api/survey/:id', survey.get);

// generic node (experimental)
app.post('/api/node/:nodeName/:uniqueAttrName', async (req, res) => {
	return crud.create(req, res, req.body.node, req.params.nodeName, req.body.relationships, req.params.uniqueAttrName);
});

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	logger.info(`Listening on ${PORT}`);
});

module.exports = app;
