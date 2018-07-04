module.exports = {
	// compare returns 0 if same integer, so this is a boolean check for equality
	// we check for existence of both to avoid the hassle of having to stub integers
	// for tests
	isSameNeo4jInteger: (int1, int2) => int1 && int2 && !int1.compare(int2)
};
