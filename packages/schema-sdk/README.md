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
