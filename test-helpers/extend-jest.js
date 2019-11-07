/* global expect */
expect.extend({
	httpError(result, expected) {
		console.log({ result, expected, status: result.status });
		expect(result.status).toEqual(expected.status);
		expect(result).toMatchObject({
			message: expect.stringMatching(expected.message),
		});
		return { pass: true };
	},
});
