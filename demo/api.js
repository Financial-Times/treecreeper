const express = require('express');
require('express-async-errors');
const { getRestApi } = require('../packages/api-rest-express');
const { logger } = require('../packages/api-core/lib/request-context');
const schema = require('../packages/schema-sdk');
const { initConstraints } = require('../packages/api-db-manager');
const {
	middleware: contextMiddleware,
} = require('../packages/api-core/lib/request-context');

const requestId = require('../packages/api-rest-express/middleware/request-id');

schema.init();
initConstraints();

const app = express();

app.use(contextMiddleware);
app.use(requestId);
app.use('/rest', getRestApi({ app }));

const PORT = process.env.PORT || 8888;
schema.ready().then(() => {
	app.listen(PORT, () => {
		logger.info(`Listening on ${PORT}`);
	});
});
