const { getType } = require('../../../packages/schema-sdk');
const { logger } = require('../../../packages/api-express/lib/request-context');

class Tracer {
	constructor() {
		this.map = {};
	}

	collect(type, field) {
		this.map[type] = this.map[type] || new Set();
		this.map[type].add(field);
	}

	_log(logType) {
		try {
			Object.entries(this.map).forEach(([type, fields]) => {
				const { properties } = getType(type);
				fields = [...fields];
				logger[logType]({
					event: 'GRAPHQL_TRACE',
					success: logType !== 'error',
					type,
					fields,
				});

				fields
					.filter(
						name =>
							properties[name] &&
							properties[name].deprecationReason,
					)
					.map(field =>
						logger.warn({
							event: 'GRAPHQL_TRACE_DEPRECATION',
							type,
							field,
						}),
					);
			});
		} catch (error) {
			logger.error({ event: 'GRAPHQL_TRACE_ERROR', error });
		}
	}

	log() {
		return this._log('info');
	}

	error() {
		return this._log('error');
	}
}

const middleware = (resolve, parent, args, context, info) => {
	if (info.parentType.name !== 'Query') {
		context.trace.collect(info.parentType.name, info.fieldName);
	}
	return resolve(parent, args, context, info);
};

module.exports = { Tracer, middleware };