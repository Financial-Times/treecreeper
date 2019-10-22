/* eslint-disable no-useless-constructor */
class BizOpsError extends Error {
	constructor(message) {
		super(message);
	}
}

module.exports = BizOpsError;
