# Structure returned by getType

Executing getType() returns an object representation of the raw type which has undergone transformations that allow the object to be used by graphql and the jsx presentation layers.
Two forms of the object representation are available: grouped and ungrouped (the default).

## Ungrouped representation
<pre>
    {
      __name__: 'TypeOne',
      __type__: 'TypeOne',
      __pluralName__: 'TypeOnes'
      __properties__:
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
      __fieldsets__:
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
</pre>

## Grouped representation
```
    { name: 'Type1',
      fieldsets:
       { main:
          { heading: 'Main properties',
            description: 'Fill these out please',
            properties: [Object] },
         secondaryProp:
          { heading: 'Standalone',
            description: undefined,
            isSingleField: true,
            properties: [Object] },
         misc: { heading: 'Miscellaneous', properties: [Object] } },
      type: 'Type1',
      pluralName: 'Type1s' }
```