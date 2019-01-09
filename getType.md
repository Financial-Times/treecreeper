# Structure returned by getType

Executing getType() returns an object representation of the raw type which has undergone transformations that allow the object to be used by graphql and the jsx presentation layers.
Two forms of the object representation are available: grouped and ungrouped (the default).

## Ungrouped representation
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
         }
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

* The **name** field is always returned as the unique identification of the type
* The **type** field is returned as an alias to the name to provide a more intuitive identification field
* The **pluralName** will either be the explicit plural provided within the yaml or the implied plural derived by adding an **s** to the type name.
* The single list of properties within this **ungrouped** structure identify their fieldsets
* The fieldset list within this **ungrouped** structure just identify their headings and descriptions

## Grouped representation
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
                    }
                }
            },
        },
    }
```

* The fieldset list within this **grouped** structure include the properties within each fieldset
* There is no separate properties structure