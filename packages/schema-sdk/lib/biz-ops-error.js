/* eslint-disable no-useless-constructor */
class TreecreeperUserError extends Error {
	constructor(message) {
		super(message);
	}
}

module.exports = TreecreeperUserError;
