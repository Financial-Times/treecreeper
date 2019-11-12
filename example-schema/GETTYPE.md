# Structure returned by getType

Executing getType() returns an object representation of the raw type which has undergone transformations that allow the object to be used by graphql and the jsx presentation layers.
Two forms of the object representation are available: grouped and ungrouped (the default).

## Ungrouped representation

### _result = getType(type)_

```
    {
      name: 'TypeOne',
      type: 'TypeOne',
      pluralName: 'TypeOnes'
      properties:
      {
         first:
         {
            type: 'Word',
            fieldset: 'main',
            label: 'A word'
         },
         second:
         {
            type: 'Document',
            fieldset: 'self',
            label: 'Standalone'
         },
         third:
         {
            type: 'SomeEnum'
         },
         forth:
         {
            type: 'Type2',
            direction: 'outgoing',
            relationship: 'HAS',
            label: 'test label',
            description: 'test description',
            hasMany: false,
            isRelationship: true,
            fieldset: 'main',
         },
      },
      fieldsets:
      {
         main:
         {
            heading: 'Main properties',
            description: 'Fill these out please'
         },
         secondary:
         {
            heading: 'Secondary properties',
            description: 'Fill these out optionally'
         }
      },
    }
```

-   The **name** field is always returned as the unique identification of the type
-   The **type** field is returned as an alias to the name to provide a more intuitive identification field
-   The **pluralName** will either be the explicit plural provided within the yaml or the implied plural derived by adding an **s** to the type name.
-   The single list of properties within this **ungrouped** structure identify their fieldsets
-   Each property definition is derived directly from from the yaml content
-   An **isRelationship** flag is added to any property which is defined as a relationship to another type within the yaml
-   An **isSingleField** flag is added to any property which is the only member of a fieldset (commonly used for large text edit fields)
-   The fieldset list within this **ungrouped** structure just identifies the heading and description of each fieldset

## Grouped representation

### _result = getType(type, {groupProperties: true})_

```
    {
        name: 'TypeOne',
        type: 'TypeTwo',
        pluralName: 'TypeOnes'
        fieldsets:
        {
            main:
            {
                heading: 'Main properties',
                description: 'Fill these out please',
                properties:
                {
                   first:
                   {
                      type: 'Word',
                      label: 'A word'
                   },
                }
            },
            secondaryProp:
            {
                heading: 'Standalone',
                description: undefined,
                isSingleField: true,
                properties:
                {
                    second:
                    {
                        type: 'Document',
                        label: 'Standalone'
                    },
                }
            },
            misc:
            {
                heading: 'Miscellaneous',
                properties:
                {
                    third:
                    {
                       type: 'SomeEnum'
                    },
                    forth:
                    {
                       type: 'TypeTwo',
                       direction: 'outgoing',
                       relationship: 'HAS',
                       label: 'test label',
                       description: 'test description',
                       hasMany: false,
                       isRelationship: true,
                    },
                }
            },
        },
    }
```

The format/content of the structure is as above apart from ...

-   The fieldset list within this **grouped** structure include the properties within each fieldset
-   There is no separate properties structure
