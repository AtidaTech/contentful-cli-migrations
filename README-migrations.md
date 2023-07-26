# How to Write Contentful Migrations

## For Starters




Add here how to write migrations with:
* async/await
* getAllLocalesCode, getDefaultLocaleCode and getDefaultValuesForLocales
* `{ makeRequest }` - See also: https://github.com/contentful/contentful-migration/blob/master/README.md
* how to transform Entries (`transformEntriesPerLocale`)
* Create environment `xxx-dev` to modify manually your content-type, and use the JSON to write the migration. Then create a `xxx-test` environment to test your migration before committing it.
