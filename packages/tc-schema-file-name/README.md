# @finantial-times/tc-schema-file-name

A tiny utility used when publishing or consuming (via schem-sdk) a treecreeper schema on a public url. The exact file name of the schema depends on the version of the libarry installed, so this utility inspects the version of the library and calculates the file name from it. It exports and objet with one method, `getFileName()`, which returns the file name as a string.

**This is not intended for use by end users directly**
