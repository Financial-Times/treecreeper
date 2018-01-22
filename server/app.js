const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const security = require('./middleware/security');
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
app.post('/api/supplier/', supplier.create);

// contract
app.get('/api/contracts/:supplierId', contract.get);

// submission
app.get('/api/submission/:id', submission.get);
app.get('/api/submissions/:contractOrSupplierId/:surveyId/:topLevel', submission.getAllforOne);
app.post('/api/submission/', submission.create);
app.put('/api/submission/:id/:surveyId', submission.update);
app.delete('/api/submission/:id', submission.remove);

// survey
app.get('/api/survey/:id', survey.get);
app.get('/api/surveys/:type', survey.getAll);

// generic node (experimental)

app.get('/api/node/:nodeName/:uniqueAttr', async (req, res) => {
	return crud.get(req, res, req.params.nodeName);
});
app.post('/api/node/:nodeName/:uniqueAttrName', async (req, res) => {
	return crud.create(req, res, req.body.node, req.params.nodeName, req.body.relationships, req.params.uniqueAttrName);
});
app.put('/api/node/:nodeName/:uniqueAttrName', async (req, res) => {
	return crud.update(req, res, req.body.node, req.params.nodeName);
});
app.delete('/api/node/:nodeName/:uniqueAttr', async (req, res) => {
	return crud.remove(req, res, req.params.nodeName, false);
});

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	logger.info(`Listening on ${PORT}`);
});

module.exports = app;
