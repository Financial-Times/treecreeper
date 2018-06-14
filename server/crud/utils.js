module.exports = {
	// compare returns 0 if same integer, so this is a boolean check for equality
	isSameNeo4jInteger: (int1, int2) => !int1.compare(int2)
};
