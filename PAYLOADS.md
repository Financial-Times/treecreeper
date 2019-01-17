# JSON Payload Structure

Write requests to the API (POST and PATCH) require both URL parameters and a JSON body to be provided. The structure of the body varies slightly depending on whether the desired create/update include relationships and whether the related records already exist.

## Basic structure

At its simplest the JSON body is just values for each of the properties named in the associated schema. 

For example: To create a new Team named "New Team" you would POST the following:

*POST /v2/node/Team/newteam*
```
{
    "code": "newteam" ,
    "name": "New Team",
    "description": "This is an example of a new team",
    "email": "new.team@ft.com",
    "slack": "newteam",
    "phone": "5432",
    "isACtive": true,
    "isThirdParty": false,
    "supportRota": "https://docs.google.com/dsdaaSFASf"
}
```

The identical structure could be passed to PATCH to update all the fields on the team.

**Neither a POST nor a PATCH of the above structure will create or adjust relationships between the team and its team members of system ownership. For thhat you need to include relationship fields.**


## Including relationships

The POST and PATCH requests support a variation to the above basic structure that allows the IDs(codes) for the related records to be provided. You just need to include the names of schema fields which are defined as links to related data.

For example: The team schema includes fields named **techLeads**, **productOwners**, **delivers** and **supports** (amoungst others) which allow the team to be connected.  To connect create AND connect a team you would post the following:

*POST /v2/node/Team/newteam*
```
{
    "code": "newteam" ,
    "name": "New Team",
    "description": "This is an example of a new team",
    "email": "new.team@ft.com",
    "slack": "newteam",
    "phone": "5432",
    "isACtive": true,
    "isThirdParty": false,
    "supportRota": "https://docs.google.com/dsdaaSFASf",
    "techLeads": [person.one, person.two],
    "productOwners": [person.three],
    "delivers": [system1, system2, system3],
    "supports": [system2, system3, system4]
}
```

The identical structure can also be used to update the relationships using PATCH but, as described below, some care is required re whether you wish to add to existing relationships or replace.

**Neither a POST nor a PATCH of the above structure will create the related data unless you provide additional URL parameters.**


## Upsert

The **upsert** URL query string option allows POST and PATCH to create the related items for you. Typically this is used during an automated upload when the provider of the data owns both the core data and all the related data.

**Beware**: incorrect use of the option, where the payload contains misspelt dependencies, will cause the creation duplicates/aliases. For example, dont upsert the techleads or product owners of a team since we already have a upload process that ensures all people are present in biz-ops (a daily people API upload).

A good example of upsert is the upload of infrastructure. For example the following POST will create an EC2 instance and its network connections:

*POST /v2/node/EC2/123454321?upsert=true*
```
{
    "code": "123454321",
    "account": ["505606707"],
    "state": "running",
    "type": "T1",
    "privateIP": "123.456.789.012",
    "publicIP": "234.456.678.890",
    "vpcID": ["456789"],
    "subnetID": ["567890"],
    "securityGroup": ["876987"],
    "environment": "t"
}
```

The effect of the above, due to the presence of **upsert=true** will be to create **EC2:123454321** and **each** of the following if **they did not already exist**:
+ Account: 505606707
+ VPC: 456789
+ Subnet: 567890
+ Security Group: 876987

Existing items are left untouched by the upsert=true option apart for acquiring the desired connection to the POSTed item.

A PATCH request works it the same way, creating the non-existent related items, but care is required re whether you intended to replace or merge the relationships.


## Replace or Merge relationships

A POST request will always deliver the effect defined in its payload since there is no previous state for the item that is being added. However, PATCH works differently since it is adjusting data which is already present. In particular, the relationships that already exist with the item.
We provide a **relationshipAction** querystring parameter which allows you to define the approach to take with the related data, as follows:
+ relationshipAction=**replace** - will cause the existing relationships to the current item to be deleted and replaced which those included in the body.
+ relationshipAction=**merge** - will trigger the relationships defined in the body to extend those that already exist.

For example: Our original creation of **New Team** (see above) triggered the following relationships to be created:
+ newteam -> techLeads -> person.one
+ newteam -> techLeads -> person.two
+ newteam -> productOwners -> person.three
+ newteam -> delivers -> system1
+ newteam -> delivers -> system2
+ newteam -> delivers -> system3
+ newteam -> supports -> system2
+ newteam -> supports -> system3
+ newteam -> supports -> system4

We will now send the following PATCH request which has different techLeads and productOwners (but the same systems):
*PATCH /v2/node/Team/newteam*
```
{
    "code": "newteam" ,
    "name": "New Team",
    "description": "This is an example of a new team",
    "email": "new.team@ft.com",
    "slack": "newteam",
    "phone": "5432",
    "isACtive": true,
    "isThirdParty": false,
    "supportRota": "https://docs.google.com/dsdaaSFASf",
    "techLeads": [person.four],
    "productOwners": [person.five],
    "delivers": [system1, system2, system3],
    "supports": [system2, system3, system4]
}
```

The request will fail because we have not supplied a value for the relationshipAction parameter. We must supply a value as the API cannot guess if we wanted to add person.four as a techLead or replace the existing techLeads.
The effect of the two settings of relationshipAction in the above scenario is as follows:

### PATCH /v2/node/Team/newteam?relationshipAction=replace
* The person.one techlead relationship is removed
* The person.two techlead relationship is removed
* A person.four techlead relationship is created
* The person.three productOwner relationship is removed
* A person.five productOwner relationship is created

The final effect is the same ass having POSTed the new version of the body to the team.


### PATCH /v2/node/Team/newteam?relationshipAction=merge
* The person.one techlead relationship is retained
* The person.two techlead relationship is retained
* A person.four techlead relationship is created
* The person.three productOwner relationship is retained
* A person.five productOwner relationship is created

The final effect is the same as having POSTed
```
{
     "code": "newteam" ,
     "name": "New Team",
     "description": "This is an example of a new team",
     "email": "new.team@ft.com",
     "slack": "newteam",
     "phone": "5432",
     "isACtive": true,
     "isThirdParty": false,
     "supportRota": "https://docs.google.com/dsdaaSFASf",
     "techLeads": [person.one,person.two,person.four],
     "productOwners": [person.three,person.five],
     "delivers": [system1, system2, system3],
     "supports": [system2, system3, system4]
 }
 ```
 
 ## upsert and relationshipAction
 
 You would combine both URL querystring parameters if you had a regular upload process where you were in full control of all the data you were uploading.  That would ensure that the result of your PATCH requested would always result in the final state of the data being as you expect without extra or missing relationships.
 
 **DO NOT** use **upsert=true** and **relationshipAction=replace** when you are updating the basic fields of a record (e.g. changing name or statue fields) as you will have the potential to corrupt all the relationships.