/* global expect */
expect.extend({
	httpError(result, expected) {
		expect(result.status).toEqual(expected.status);
		expect(result).toMatchObject({
			message: expect.stringMatching(expected.message),
		});
		return { pass: true };
	},
});
