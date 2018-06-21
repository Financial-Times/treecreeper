module.exports = (req, res, next) => {
	res.locals.clientId = req.get('client-id');
	next();
};
