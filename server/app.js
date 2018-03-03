const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const security = require('./middleware/security');
const supplier = require('./controllers/supplier');
const survey = require('./controllers/survey');
const contract = require('./controllers/contract');
const sar = require('./controllers/sar');
const submission = require('./controllers/submission');
const crud = require('./controllers/_crud');
const cypher = require('./controllers/_cypher');
const init = require('../scripts/init');

const app = express();

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.use(bodyParser.json());
app.use(security);

app.set('case sensitive routing', true);

app.get('/', (req, res) => {
	res.send('biz op api');
});

// SAR HUB - Specific (to phase out)
app.post('/api/sar', sar.create);
app.get('/api/sar/:id', sar.getWithSources);

// WEBPMA / 3SP - Specific (to phase out)
app.get('/api/contracts/:supplierId', contract.get);
app.get('/api/submissions/:contractOrSupplierId/:surveyId/:topLevel', submission.getAllforOne);
app.get('/api/survey/:id', survey.get);
app.get('/api/surveys/:type', survey.getAll);
app.post('/api/supplier/', supplier.create);
app.post('/api/submission/', submission.create); // TODO can be abstracted - add relationships
app.put('/api/submission/id/:submissionId', submission.update);

// GENERIC - Node
app.get('/api/:nodeType/:uniqueAttrName?/:uniqueAttr?', async (req, res) => {
	console.log('[APP] generic GET', req.params);
	return crud.get(res, req.params.nodeType, req.params.uniqueAttrName, req.params.uniqueAttr);
});
app.post('/api/:nodeType/:uniqueAttrName/:uniqueAttr/:upsert?', async (req, res) => {
	console.log('[APP] generic POST');
	return crud.create(res, req.params.nodeType, req.params.uniqueAttrName, req.params.uniqueAttr, req.body.node, req.body.relationships, req.params.upsert);
});
app.put('/api/:nodeType/:uniqueAttrName/:uniqueAttr/:upsert?', async (req, res) => {
	console.log('[APP] generic PUT');
	return crud.update(res, req.params.nodeType, req.params.uniqueAttrName, req.params.uniqueAttr, req.body.node, req.params.upsert);
});
app.delete('/api/:nodeType/:uniqueAttrName/:uniqueAttr', async (req, res) => {
	console.log('[APP] generic DELETE');
	return crud.remove(res, req.params.nodeType, req.params.uniqueAttrName, req.params.uniqueAttr, req.body.mode);
});

// GENERIC - Rship
app.post('/api/relationships/:upsert?', async (req, res) => {
	console.log('[APP] generic POST - rship');
	return crud.create(res, null, null, null, null, req.body.relationships, req.params.upsert);
});


app.post('/api/cypher/', async (req, res) => {
	console.log('[APP] generic GET CYPHER');
	cypher(res, req.body.query);
});

if (process.env.NODE_ENV !== 'production') {
	app.get('/init', init);
}

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	logger.info(`Listening on ${PORT}`);
});

module.exports = app;
