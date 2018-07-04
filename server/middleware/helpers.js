const writeRestriction = res => {
	!/^(cmdb-to-bizop|DROP ALL|(delete|update|create|test)-client-id|(create|delete|update)-relationship-client)$/.test(
		res.locals.clientId
	);
};

const readRestriction = res => {
	!/^(cmdb-to-bizop|DROP ALL|(read|test)-client-id|(read|test)-relationship-client)$/.test(
		res.locals.clientId
	);
};

module.exports = { writeRestriction, readRestriction };
