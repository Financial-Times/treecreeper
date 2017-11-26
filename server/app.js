const express = require('express');
const bodyParser = require('body-parser');
const logger = require('@financial-times/n-logger').default;
const security = require('./middleware/security');
const checks = require('./lib/checks');
const supplier = require('./controllers/supplier');
const survey = require('./controllers/survey');
const contract = require('./controllers/contract');
const submission = require('./controllers/submission');

const app = express();

app.get('/__gtg', (req, res) => {
	res.status(200).end();
});

app.use(bodyParser.json());
app.use(security);

app.get('/', (req, res) => {
	res.send('biz op api');
});

// get one
app.get('/api/supplier/:id', supplier.get);
app.get('/api/contract/:id', contract.get);
app.get('/api/submission/:id', submission.get);
app.get('/api/survey/:id', survey.get);

// get all
app.get('/api/contracts/:supplierId', contract.get);
app.get('/api/suppliers/', supplier.getAll);


// create a new one
app.post('/api/supplier/', supplier.create);
app.post('/api/contract/', contract.create);
app.post('/api/submission/', submission.create);
app.post('/api/survey/', survey.create);

// modify an existing one
app.put('/api/supplier/', supplier.update);
app.put('/api/contract/', contract.update);
app.put('/api/submission/', submission.update);
app.put('/api/survey/', survey.update);

// delete an existing one
app.delete('/api/supplier/:id', supplier.remove);
app.delete('/api/contract/:id', contract.remove);
app.delete('/api/submission/:id', submission.update);
app.delete('/api/survey/:id', survey.update);

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	logger.info(`Listening on ${PORT}`);
});

module.exports = app;
