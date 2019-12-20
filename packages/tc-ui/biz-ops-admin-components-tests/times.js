const { formatDateTime } = require('../../src/templates/helpers');

describe('Format date and time', () => {
	it('returns formatted date and time', () => {
		expect(
			formatDateTime(
				'Thu Jan 24 2019 11:44:54 GMT+0000 (GMT)',
				'DateTime',
			),
		).toEqual('24 January 2019, 11:44:54 am');
	});

	it('returns formatted date', () => {
		expect(formatDateTime('Thu Jan 24 2019', 'Date')).toEqual(
			'24 January 2019',
		);
	});

	it('returns formatted time', () => {
		expect(
			formatDateTime('Thu Jan 24 2019 11:44:54 GMT+0000 (GMT)', 'Time'),
		).toEqual('11:44:54 am');
	});

	it('returns unformatted time when no date is given', () => {
		expect(formatDateTime('11:44:54 GMT+0000 (GMT)', 'Time')).toEqual(
			'11:44:54 GMT+0000 (GMT)',
		);
	});

	it('returns null when data value is an empty string', () => {
		expect(formatDateTime('', 'DateTime')).toEqual(null);
	});
});
