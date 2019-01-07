const EventLogWriter = require('../../server/lib/event-log-writer');

describe('Event log writer', () => {
	const defaultEvent = {
		action: 'CREATE',
		code: 'biz-ops-tests',
		type: 'ATestType'
	};
	let stubKinesis;
	let eventLogWriter;

	beforeEach(() => {
		stubKinesis = {
			putRecord: jest.fn()
		};

		eventLogWriter = new EventLogWriter(stubKinesis);
	});

	afterEach(() => {});

	it('should do a single putRecord Kinesis API call per record', async () => {
		await eventLogWriter.sendEvent(defaultEvent);

		expect(stubKinesis.putRecord).toHaveBeenCalledTimes(1);
		expect(stubKinesis.putRecord.mock.calls[0]).toHaveLength(1);
	});

	it('should add the action', async () => {
		const givenValue = 'UPDATE';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				action: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].action).toBe(givenValue);
	});

	it('should add the code', async () => {
		const givenValue = 'dummySystemCode';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				code: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].code).toBe(givenValue);
	});

	it('should add the type', async () => {
		const givenValue = 'RepositorY';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				type: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].type).toBe('RepositorY');
	});

	new Array(2).fill(1).forEach(() => {
		const time = Math.floor(Math.random() * 10 ** 9);
		it.skip(`should add the correct timestamp when the clock ticks ${time} millis`, async () => {
			jest.useFakeTimers();

			jest.advanceTimersByTime(time);
			await eventLogWriter.sendEvent(defaultEvent);

			expect(stubKinesis.putRecord.mock.calls[0][0].time).toBe(
				Math.floor(time / 1000)
			);
			jest.clearAllTimers();
		});
	});
});
