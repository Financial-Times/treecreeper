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

// SUPPLIER
app.post('/api/supplier/', supplier.create);

// CONTRACT
app.get('/api/contracts/:supplierId', contract.get);

// SUBMISSION

app.get('/api/submissions/:contractOrSupplierId/:surveyId/:topLevel', submission.getAllforOne);
app.post('/api/submission/', submission.create);


// SURVEY
app.get('/api/survey/:id', survey.get);
app.get('/api/surveys/:type', survey.getAll);





// MOVE TO GENERIC IN SOURCE APPS
// app.get('/api/submission/:uniqueAttr', async (req, res) => {
// 	return crud.get(req, res, 'Submission', 'id', req.param.uniqueAttr); // TODO unique attr
// });
app.put('/api/submission/:id/:surveyId', async (req, res) => {
	return crud.update(req, res, req.body.node, 'Submission'); // TODO unique attr
});
// app.get('/api/suppliers/', async (req, res) => {
// 	return crud.getAll(req, res, 'Submission', 'id', req.param.uniqueAttr); // TODO unique attr and syntax
// });



// GENERIC
app.get('/api/:nodeName/:uniqueAttrName*?/:uniqueAttr*?', async (req, res) => {
	return crud.get(req, res, req.params.nodeName, req.params.uniqueAttrName, req.params.uniqueAttr);
});
app.post('/api/:nodeName/:uniqueAttrName', async (req, res) => {
	return crud.create(req, res, req.body.node, req.params.nodeName, req.body.relationships, req.params.uniqueAttrName);
});
app.put('/api/:nodeName/:uniqueAttr', async (req, res) => {
	return crud.update(req, res, req.body.node, req.params.nodeName);
});
app.delete('/api/:nodeName/:uniqueAttr', async (req, res) => {
	return crud.remove(req, res, req.params.nodeName, false);
});

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	logger.info(`Listening on ${PORT}`);
});

module.exports = app;
