const { getType } = require('@financial-times/tc-schema-sdk');
const { logger } = require('@financial-times/tc-api-express-logger');



class Tracer {
	constructor(context) {
		this.typesMap = {};
		this.context = { ...context };
	}

	getContainer(type) {
		this.typesMap[type] = this.typesMap[type] || {fields: new Set(), args: new Set()};
		return this.typesMap[type]
	}

	collectField(type, field) {
		console.log('asdsalkjd ask.jd ')
		const {fields} = this.getContainer(type)
		fields.add(field);
	}

	collectArgs(type, args) {
		console.log('asdsalkjd ask.jd safsfsefsdf')
		const {args: argsSet} = this.getContainer(type)
		Object.keys(args)
			.filter((key) => !['offset', 'first', 'filter'].includes(key))
			.forEach((key) =>
				argsSet.add(key)
			)
		()
	}

	logDeprecated (propDefs, fields, usageType) {
		fields
					.filter(
						name =>
							propDefs[name] &&
							propDefs[name].deprecationReason,
					)
					.forEach(field =>
						logger.warn({
							event: 'GRAPHQL_TRACE_DEPRECATION',
							type,
							field,
							usageType,
							...this.context,
						}),
					);
	}

	_log(logType) {
		console.log('ASRHDGRASDGH SADJASGD ASHD', this.typesMap)
		try {
			Object.entries(this.typesMap).forEach(([type, {fields, args}]) => {
				const { properties: prodDefs } = getType(type);
				fields = [...fields];
				logger[logType]({
					event: 'GRAPHQL_TRACE',
					success: logType !== 'error',
					type,
					fields,
					args,
					...this.context,
				});
				this.logDeprecated(propDefs, fields, 'field')
				this.logDeprecated(propDefs, args, 'arg')
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
		console.log(
info

			)
	if (info.parentType.name !== 'Query') {

		context.trace.collectField(info.parentType.name, info.fieldName);
		context.trace.collectArgs(info.parentType.name, args);
	}
	return resolve(parent, args, context, info);
};

module.exports = { Tracer, middleware };
