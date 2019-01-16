describe('AWS kinesis client', () => {
	const streamName = `${Math.random()}mississippi`;
	const dynoId = `someDyno${Math.floor(Math.random() * 10)}`;

	let kinesis;
	const storedEnv = {};
	let stubPutRecord;

	beforeEach(() => {
		const kinesisStub = jest.fn();
		jest.doMock('aws-sdk', () => ({
			Kinesis: kinesisStub,
		}));
		const Kinesis = require('../../server/lib/kinesis-client'); // eslint-disable-line global-require
		storedEnv.NODE_ENV = process.env.NODE_ENV;
		storedEnv.DYNO = process.env.DYNO;
		process.env.NODE_ENV = 'production';
		process.env.DYNO = dynoId;
		stubPutRecord = jest.fn().mockReturnValue({
			promise() {
				return Promise.resolve();
			},
		});
		kinesisStub.mockImplementation(() => ({
			putRecord: stubPutRecord,
		}));

		kinesis = new Kinesis(streamName);
	});

	afterEach(() => {
		Object.entries(storedEnv).forEach(([key, value]) => {
			process.env[key] = value;
		});
	});

	describe('put record', () => {
		it('should write to the given stream name in both AWS accounts', async () => {
			await kinesis.putRecord({
				event: 'test',
			});

			expect(stubPutRecord).toHaveBeenCalledTimes(1);
			expect(stubPutRecord.mock.calls[0][0].StreamName).toBe(streamName);
		});

		it('should JSON stringify then buffer the event data', async () => {
			const givenData = {
				event: 'test',
				someField: null,
				otherField: 'string',
				number: 1,
			};
			await kinesis.putRecord(givenData);

			const encodedData = stubPutRecord.mock.calls[0][0].Data;

			expect(JSON.parse(Buffer.from(encodedData).toString())).toEqual(
				givenData,
			);
		});

		it('should set the partition key to be the Heroku dyno ID plus timestamp', async () => {
			await kinesis.putRecord({});

			expect(stubPutRecord.mock.calls[0][0].PartitionKey).toMatch(
				new RegExp(`${dynoId}:\\d+`),
			);
		});
	});
});
