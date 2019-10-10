// FROM POST
describe('updating disconnected records', () => {
it('updates record with properties', async () => {});
it('updates record with Documents', async () => {});
it('updates Date property', async () => {});
it('updates Datetime property', async () => {});
it('updates Time property', async () => {});
it("unsets a property when empty string provided", async () => {});
it('not unset property when falsy value provided', async () => {});
it('updates metadata', async () => {});
it('no clientId deletes the _updatedByClient property', async () => {});
it('no clientUserId deletes the _updatedByUser property', async () => {});
it('throws 400 if code in body conflicts with code in url', async () => {});
it('throws 400 if attempting to write property not in schema', async () => {});
})
describe('generic error states', () => {
it('throws if neo4j query fails', async () => {});
it('throws if s3 query fails', async () => {});
it('undoes any s3 actions if neo4j query fails', async () => {});
});

