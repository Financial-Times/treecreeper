// @treecreeper/sdk
const getInstance = ({
schemaConsumer
}) => {
const dataAccessors = new DataAccessors(schemaConsumer);
const validators = new Validators(dataAccessors);

    return {
        dataAccessors,
        validators,
    }

}

let singleton;
exports class SchemaSDK {
static getSingleton: (schemaConsumer) => : sdk
}

// @treecreeper/schema-consumer

// @treecreeper/schema-publisher

        const dataAccessors = getDataAccessors(rawData);
        const validators = getValidators(dataAccessors);

        return Object.assign(
            {
                on: rawData.on.bind(rawData),
                configure: rawData.configure.bind(rawData),
                startPolling: rawData.startPolling.bind(rawData),
                stopPolling: rawData.stopPolling.bind(rawData),
                refresh: rawData.refresh.bind(rawData),
                normalizeTypeName: name => name,
                primitiveTypesMap: primitiveTypes,
                sendSchemaToS3: env => sendSchemaToS3(env, rawData.getAll()),
                getSchemaFilename,
            },

            dataAccessors,
            validators,
        );

```
class DataAccessors {
    constructor(schemaClient) {
        this.schemaClient = schemaClient
        this.cache = new Cache();
        this.schemaClient.on('change', () => this.cache.clear())
        this.getType = this.cache.wrap(this.getType.bind(this))
    }

    getType (type, options = {}){
        checkCache(type, option1, option2...)
    }
}
```
