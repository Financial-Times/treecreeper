# Architecture

Treecreeper is driven by a schema, maintained in YAML.

# Single application architecture

The simplest architecture to provide an API and CMS is as follows:

-   The schema files are maintained in a directory
-   The tc-api-express, using tc-schema-sdk internally, consumes the local YAML files and uses these to define REST and GraphQL APIs
-   tc-ui, again using tc-schema-sdk internally, consumes the YAML files and uses these to construct a UI for all the data types supported by the API

In the above scenario, where the API, UI and schema live in the same directory, changing the schema entails deploying the entire app.

# Distributed architecture

A variant on this is to split the schema, API and UI into different applications/repositories. In this scenario

-   Use tc-schema-publisher to convert the YAML files to JSON and publish to S3
-   tc-api-express polls the url the schema is hosted on. When it detects a change, it updates both the REST and GraphQL APIs and republishes the schema to another url. So, the API might consume `/latest/schema.json` and republish to `/api/schema.json`
-   An application that uses tc-ui must also initialise tc-schema-sdk appropriately before trying to use tc-ui

Advantages of the above approach include being able to scale independently, and separating access to modify the schema (which might be widespread) from access to modify the applications using it. It also means that other applications that may benefit from using the schema, tc-ui etc can piggyback onto this published copy of the schema
