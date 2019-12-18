const { getType } = require('@financial-times/tc-schema-sdk');
const { logger } = require('@financial-times/tc-api-express-logger');

class Tracer {
	constructor(context) {
		this.map = {};
		this.context = { ...context };
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
					...this.context,
				});

				fields
					.filter(
						name =>
							properties[name] &&
							properties[name].deprecationReason,
					)
					.forEach(field =>
						logger.warn({
							event: 'GRAPHQL_TRACE_DEPRECATION',
							type,
							field,
							...this.context,
						}),
					);
			});
		} catch (error) {
			logger.error(
				{ event: 'GRAPHQL_TRACE_ERROR', ...this.context },
				error,
			);
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
