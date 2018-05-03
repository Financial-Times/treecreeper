'use strict';

const AWS = require('aws-sdk');
const sinon = require('sinon');
const { expect } = require('chai');
const Kinesis = require('../../server/lib/kinesis');

describe('AWS kinesis client', () => {
	const streamName = Math.random() + 'mississippi';
    const dynoId = 'someDyno' + Math.floor(Math.random() * 10);
	let sandbox;
	let stubPutRecord;
	let kinesis;
    let storedEnv = {};
    let clock;

	beforeEach(() => {
        storedEnv['NODE_ENV'] = process.env.NODE_ENV;
        storedEnv['DYNO'] = process.env.DYNO;
        process.env.NODE_ENV = 'production';
        process.env.DYNO = dynoId;
		sandbox = sinon.sandbox.create();
        stubPutRecord = sandbox.stub().returns({
            promise() {
                return Promise.resolve();
            }
        });
        sandbox.stub(AWS, 'Kinesis').returns({
            putRecord: stubPutRecord
        });
        clock = sandbox.useFakeTimers();
		kinesis = new Kinesis(streamName);
	});

	afterEach(() => {
		sandbox.restore();
        Object.entries(storedEnv).forEach(([key, value]) => {
            process.env[key] = value;
        });
	});

    describe('put record', () => {
        it('should write to the given stream name', async () => {
            await kinesis.putRecord({
                event: 'test'
            });

            expect(stubPutRecord).to.have.been.calledOnce;
            expect(stubPutRecord.getCall(0).args[0].StreamName).to.equal(streamName);
        });

        it('should JSON stringify then buffer the event data', async () => {
            const givenData = {
                event: 'test',
                someField: null,
                otherField: 'string',
                number: 1
            };
            await kinesis.putRecord(givenData);

            const encodedData = stubPutRecord.getCall(0).args[0].Data;

            expect(JSON.parse(Buffer.from(encodedData).toString())).to.deep.equal(givenData);
        });

        it('should set the partition key to be the Heroku dyno ID plus timestamp', async () => {
            const givenTime = Math.floor(Math.random() * 10 ** 9);
            clock.tick(givenTime);
            await kinesis.putRecord({});

            expect(stubPutRecord.getCall(0).args[0].PartitionKey).to.equal(`${dynoId}:${givenTime}`)
        })
    })
});
