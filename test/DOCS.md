# About these tests

## Methodology

Almost all the tests are integration tests for the e2e result of calling the API, executing a database query and returning a result. There are small pieces of functionality mocked, and for each one there are unit tests for the library used, so that we can confidently mock them and, where necessary, define stub responses:

-   sending an event to the kinesis stream
-   writing large properties to s3
-   generating an ID in salesforce

### Parallelisation & test data

We use Jest as the test runner so that test suites can run in parallel. However, we have a single database instance that these tests all use, so great care is taken to ensure tests are isolated from one another.

The basic approach is to give every test suite a namespace. Each test creates test data which uses the namespace as part of the `code` properties identifying the data it creates. This makes it possible to query for the test data after each test and target it for clean it up. It also means no test suite will create test dat athat clashes with other test suites.

### Expectations

In most of the tests there are 3 assertions made

-   that the api responds as expected
-   that the data in the database (and s3) is updated as expected
-   that events are sent into kinesis as expected

## Helpers

### supertest.js

Supertest is a library for running integration tests against an api. Like most things in Javascript, it exposes prototypes that can be extended, so that's what happens here. Several utilities are added:

-   `.namespacedAuth()` - this will add authorization headers (client-id, api-key, client-user-id) to the request based on the namespace of the current test suite
-   `.auth(clientId)` - similar to the above, but just sets the api key and a custom client-id header (useful for testing scenarios which are a little out of the ordinary)

### db-connection.js

This has some utilties for simulating bad database behaviour and also spying on individual calls to it

-   spyDbQuery
-   stubDbUnavailable
-   stubDbTransaction

### test-data.js

This is where most of the really important stuff happens. It's complicated and coudl probably do with a big refactor/rethink

It exports a number of things

-   `testDataCreators` - used by the main sandbox (see below) to provide helpers for creating test data
-   `dropDb` used by the main sandbox (see below) to clean up test data after a test
-   `testDataCheckers.testNode` - tests that a database record exists and has the expected properties and relationships
-   `testDataCheckers.verifyNotExists` - verifies that a given database record does not exist
-   `testDataCheckers.verifyExists` - verifies that a given database record exists

### index.js

The main thing this exports is the setupMocks function

`setupMocks(sandbox, { withDb = true, namespace } = {}, includeClientId)`

returns `sandbox`

-   `sandbox` - an empty object, which is used as a container to attach the following useful methods to, which can be used when setting up tests:
    -   `createNode`/`createNodes` - used to create test records in the database
    -   `connectNodes` - used to create relationships between test records
    -   `withMeta`/`withUpdateMeta`/`withCreateMeta` - utility to add metadata properties to an object (which are created automatically by the API) so that tests can provide quite minimal test expectations
    -   `expectEvents` - used to verify that expected events have been sent to kinesis
    -   `expectNoEvents` - used to verify that no events have been sent to kinesis
    -   `request` - an instance of supertest with some custom utitlity methods added (see above)

## Example

```js
const app = require('../../server/app.js');

const {
	setupMocks,
	stubDbUnavailable,
	testNode,
	verifyNotExists,
	verifyExists,
} = require('../helpers');

describe('v2 - node POST', () => {
	// Define an empty sandbox object to act as container for
	// namespace-aware methods
	const sandbox = {};
	// define your namespace
	const namespace = 'v2-node-post';
	// use your namespace in the codes of any records you create
	const teamCode = `${namespace}-team`;

	// inject the namespace into the sandbox
	setupMocks(sandbox, { namespace });

	it('create node', async () => {
		// use the supertest instance ('request') provided by the sandbox
		await sandbox
			.request(app)
			.post(`/v2/node/Team/${teamCode}`)
			// in most tests where you wnat to test using an authenticated user
			// this will save you a few lines of code
			.namespacedAuth()
			.send({ name: 'name1' })
			.expect(
				200,
				// this means the test object below will be decorated with the
				// metadata you'd expect to see when the request creates a record
				sandbox.withCreateMeta({
					code: teamCode,
					name: 'name1',
				}),
			);

		// This tests that the data has been created successfully in the database
		// Always await this one
		await testNode(
			'Team',
			teamCode,
			sandbox.withCreateMeta({
				code: teamCode,
				name: 'name1',
			}),
		);

		// this tests that events have been pushed onto the kinesis stream
		// no need to await this one
		sandbox.expectEvents(['CREATE', teamCode, 'Team', ['code', 'name']]);
	});
});
```
