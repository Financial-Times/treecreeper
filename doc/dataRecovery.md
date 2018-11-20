## Full restore

1. Navigate to graphene db from https://dashboard.heroku.com/apps/biz-ops-api
2. If required, take a database snapshot
3. Click restore on the required backup

## Partial restore
1. Navigate to graphene db from https://dashboard.heroku.com/apps/biz-ops-api
2. Download the required backup
3. Extract the data and copy into `./neo4j/data/databases`, deleting what was there before
<<<<<<< HEAD
4. Inspect the live DB to discover which records need restoring and get a list of codes as necessary
5. Start your local api
6. Write a script to iterate through the bad codes, retrieve good data from teh backup and write to production. Below is an example (used to recreate relationships between healthchecks and systems)
=======
4. Inspect the live DB to discover which records need restoring and get a list of codes as necessary. `_updated...` metadata fields can help with this
5. Start your local api
6. Write a script to iterate through the bad codes, retrieve good data from the backup and write to production. Below is an example (used to recreate relationships between healthchecks and systems)
>>>>>>> af580e87eef2e6821be495c39ccf815ecaa97560


```javascript
const fetch = require('node-fetch');

const call = () =>
  [
    // list of healthcheck codes
  ].map(code => {
    return fetch(
      `http://local.ft.com:8888/v2/node/Healthcheck/${encodeURIComponent(
        code
      )}`,
      { headers: { 'client-id': 'data-recovery' } }
    )
      .then(res => res.json())
      .then(({ monitors }) => {
        if (monitors && monitors.length) {
          const body = JSON.stringify({
            monitors
          })
          return fetch(
            `https://api.ft.com/biz-ops/v2/node/Healthcheck/${encodeURIComponent(
              code
            )}?relationshipAction=merge`,
            {
              headers: {
                'client-id': 'data-recovery',
                'Content-Type': 'application/json',
                'x-api-key': process.env.PROD_BIZ_OPS_API_KEY
              },
              method: 'PATCH',
              body
            }
          );
        }
      });
  });

Promise.all(call());

```
