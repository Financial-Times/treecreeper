# @financial-times/tc-api-s3-document-store

Module for connecting a Treecreeper&tm; api to an s3 bucket to use as an additional data store for storing properties that are too large to allow efficient querying in neo4j.

Any module implementing the same interface can also be passed to other treecreeper packages in order to use alternative choices of store.

When an s3 document store is present, properties which have the type `Document` will be stored in s3, and will be retrieved from there by graphql resolvers

## Creating an instance

This package exports two methods:

-   `createStore(s3BucketName)` - this will create an instance of the package, creating an s3 client which will authorise with whatever credentials are detected in the environment. Rather than passing in the `s3BucketName` parameter, the `TREECREEPER_DOCSTORE_S3_BUCKET` environment variable can be set instead
-   `docstore(s3Instance, bucketName)` - as above, but allows passing in a custom instance of the `AWS.S3` client

## API

Every instance implements the following CRUD methods:

-   `get(nodeType, code)`
-   `post(nodeType, code, body)`
-   `patch(nodeType, code, body)`
-   `delete(nodeType, code)`
-   `absorb(nodeType, code, absorbedCode)`

All are self explanatory (yes, yes, I know... will document in full later. For now just need basic README's in place) with the exception of `absorb`, which takes the record for `absorbedCode`, copies any properties it has that don't already exist on `code` over, and then deletes the record for `absorbedCode`

Each method returns an object containing a `body` property, which itself contains an object that contains all the properties stored in the docstore for that record

In addition, all write methods return another property, `undo`, which is a function that can be called to revert the last action.

## Example

```js
const { createDocstore } = require('@financial-times/tc-api-s3-document-store');
const { getApp } = require('@financial-times/tc-api-express');
const documentStore = createDocstore('big-musical-properties');

const app = getApp({ documentStore });

app.listen(80);
```

If `lyrics` is defined in the schema as a `Document`, the following request will save them to s3

```shell
curl http://localhost:80/Song/stereo -X POST -d '{
        "name": "Stereo",
        "artist": ["pavement"],
        "writer": "stephen-malkmus",
        "lyrics": "Pigs, they tend to wiggle when they walk
The infrastructure rots
And the owners hate the jocks
With their agents and their dates

If the signatures are checked
You\'ll just have to wait

And we\'re counting up the instants that we save
Tired nation so depraved
From the cheap seats see us
Wave to the camera
It took a giant ramrod
To raze the demon settlement

But high-ho silver, ride
High-ho silver, ride

Take another ride to see me home
Listen to me
I\'m on the stereo stereo
Oh my baby baby baby baby babe
Gave me malaria hysteria

What about the voice of Geddy Lee
How did it get so high?
I wonder if he speaks like an ordinary guy?
(I know him and he does)

And you're my fact-checkin' cuz
(Aww)

Well focus on the quasar in the mist
The Kaiser has a cyst
And I\'m a blank want list
The qualms you have and if they stick
They will drown you in a crick
In the neck of a woods
That was populated by
Tired nation on the fly
Everybody knows advice
That was given out for free
Lots of details to discern
Lots of details

But high-ho silver ride
High-ho silver ride

Takes another ride to make me
Oh, get off the air
I'm on the stereo stereo
Oh my baby baby baby baby baby babe
Gave me malaria hysteria"
}
```
