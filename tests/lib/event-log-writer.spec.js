'use strict';

const sinon = require('sinon');
const { expect } = require('chai');
const EventLogWriter = require('../../server/lib/event-log-writer');

describe('Event log writer', () => {
	const defaultEvent = {
		event: 'SOME_EVENT',
		action: EventLogWriter.actions.CREATE,
		code: 'biz-ops-tests',
		type: 'ATestType',
	};
	let sandbox;
	let clock;
	let stubKinesis;
	let eventLogWriter;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		stubKinesis = {
			putRecord: sandbox.stub(),
		};
		clock = sandbox.useFakeTimers();
		eventLogWriter = new EventLogWriter(stubKinesis);
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should do a single putRecord Kinesis API call per record', async () => {
		const givenValue = '';
		await eventLogWriter.sendEvent(defaultEvent);

		expect(stubKinesis.putRecord).to.have.been.calledOnce;
		expect(stubKinesis.putRecord.getCall(0).args).to.have.length(1);
	});

	it('should add legacy attributes to a given node for backwards compatibility with CMDB', async () => {
		const givenType = 'SAlad';
		const givenCode = 'LEttuce';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				type: givenType,
				code: givenCode,
			})
		);

		const call = stubKinesis.putRecord.getCall(0).args[0];
		expect(call).to.have.property('key', `${givenType.toLowerCase()}/${givenCode}`);
		expect(call).to.have.property('model', 'DataItem');
		expect(call).to.have.property('name', 'dataItemID');
		expect(call).to.have.property('value', givenCode);
	});

	it('should add the upper cased event', async () => {
		const givenValue = 'updated_thing';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				event: givenValue,
			})
		);

		expect(stubKinesis.putRecord.getCall(0).args[0].event).to.equal('UPDATED_THING');
	});

	it('should add the action', async () => {
		const givenValue = EventLogWriter.actions.UPDATE;
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				action: givenValue,
			})
		);

		expect(stubKinesis.putRecord.getCall(0).args[0].action).to.equal(givenValue);
	});

	it('should add the code', async () => {
		const givenValue = 'dummySystemCode';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				code: givenValue,
			})
		);

		expect(stubKinesis.putRecord.getCall(0).args[0].code).to.equal(givenValue);
	});

	it('should add the type in lower case', async () => {
		const givenValue = 'RepositorY';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				type: givenValue,
			})
		);

		expect(stubKinesis.putRecord.getCall(0).args[0].type).to.equal('repository');
	});

	it('should add any nested relationship attributes provided', async () => {
		const givenValue = {
			from: 'someThing',
			direction: 'to',
		};
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				relationship: givenValue,
			})
		);

		expect(stubKinesis.putRecord.getCall(0).args[0].relationship).to.equal(givenValue);
	});

	it('should add a URL encoded link to the API resource', async () => {
		const givenAttributes = {
			type: 'kebab&',
			code: 'frehs:donner+',
		};
		await eventLogWriter.sendEvent(Object.assign({}, defaultEvent, givenAttributes));

		expect(stubKinesis.putRecord.getCall(0).args[0].link).to.equal('/api/kebab%26/frehs%3Adonner%2B');
	});

	new Array(2).fill(1).forEach(timeStamp => {
		const time = Math.floor(Math.random() * 10 ** 9);
		it(`should add the correct timestamp when the clock ticks ${time} millis`, async () => {
			clock.tick(time);
			await eventLogWriter.sendEvent(defaultEvent);

			expect(stubKinesis.putRecord.getCall(0).args[0].time).to.equal(Math.floor(time / 1000));
		});
	});
});
