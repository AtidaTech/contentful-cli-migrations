# 🐦 How to Write Contentful Migrations

## For Starters

Contentful migrations are very similar to Database migrations. And the power of scripting migrations is that the Contentful
Content-types (equivalent to Database tables) can have a unique structure that fits the current needs of the Editors and
Developers. 

Some of the best resources to start writing migrations are:
* [Scripting migrations with the Contentful CLI](https://www.contentful.com/developers/docs/tutorials/cli/scripting-migrations/)
* [The right way to migrate your content...](https://www.contentful.com/blog/using-the-contentful-migration-cli/)
* [Contentful migration official README](https://github.com/contentful/contentful-migration/blob/master/README.md)

However, as the official Migration CLI (and NPM library) takes care of so many things, it is left to the user/developer
to implement a suitable strategy to make migrations reliable and make the different environments work in a reliable way.

## Use environments as branches

One of the first things to do is to think, for all intents and purposes, of Contentful Environments as Git Branches. 
The idea behind is that we can create a new 'Environment' from an existing one (let's say 'dev'), create then a migration
and test it properly. When everything is set, this migration can be committed alongside with the code, and be executed 
on the 'dev' Environment assuring that the Content-types are correctly migrated and no data is corrupted during that process. 

Similarly, we could use the scripted migration in a CI/CD pipeline, to automatically apply the same migrations to a 'staging' 
or 'master' Environment whenever the code is deployed from their respective branches.

### Use a '-dev' and '-test' environment

But one of the first things to do is to actually create and/or modify existing Content-types to see if they fit whatever 
FE Development is intended for them. And meanwhile it is true that a simple migration can be scripted right away, it is
always better to start with a new Environment to make these modifications, till we are satisfied with them.

A suggestion is to create a new Environment, using the migration number, or the ticket ID from JIRA, or anything else
really that can make the Environment name unique. Let's assume we arrived at migration '26' and we want to work on a new
set of modifications, we could call the Environment (duplicated from 'dev' or 'master') `0027-dev`. In this branch we
could manually change, add, and remove Content-types till we are satisfied with the final result.

Let's open you Contentful Web App (https://app.contentful.com/) and go to the tab 'Content model'. Once there click 
on the blue button '+ Add content type'. We are going add a fictitious 'Blog Post' Content-type, just to show a relatable
example. We then proceed to add some fields:

* `title` / short text - Select the field as 'Entry title' and 'Required Field'.
* `slug` / short text - Configure it as 'Required' and 'Unique' - Towards the end select 'Appearance > Slug'.
* `post` / rich text - Just use default settings and click 'Confirm'.

Remember to click on 'Save' in the top right corner. You should see in your editor something like this:
![New Blog Post Content-type](./images/migrations-01-add-new-content-type.png)

But how do you transform a manual edit into a Contentful migration? This is mostly thanks to the 'JSON preview'. The 
resulting JSON structure can be easily ported to the Javascript syntax of the migration. Let's see how the JSON looks 
like:

<details>
    <summary>JSON object of the new Content-type</summary>

```json
{
  "name": "Blog Post",
  "description": "New Amazing Blog articles",
  "displayField": "title",
  "fields": [
    {
      "id": "title",
      "name": "title",
      "type": "Symbol",
      "localized": false,
      "required": true,
      "validations": [],
      "disabled": false,
      "omitted": false
    },
    {
      "id": "slug",
      "name": "slug",
      "type": "Symbol",
      "localized": false,
      "required": true,
      "validations": [
        {
          "unique": true
        }
      ],
      "disabled": false,
      "omitted": false
    },
    {
      "id": "post",
      "name": "post",
      "type": "RichText",
      "localized": false,
      "required": false,
      "validations": [
        {
          "enabledMarks": [
            "bold",
            "italic",
            "underline",
            "code",
            "superscript",
            "subscript"
          ],
          "message": "Only bold, italic, underline, code, superscript, and subscript marks are allowed"
        },
        {
          "enabledNodeTypes": [
            "heading-1",
            "heading-2",
            "heading-3",
            "heading-4",
            "heading-5",
            "heading-6",
            "ordered-list",
            "unordered-list",
            "hr",
            "blockquote",
            "embedded-entry-block",
            "embedded-asset-block",
            "table",
            "hyperlink",
            "entry-hyperlink",
            "asset-hyperlink",
            "embedded-entry-inline"
          ],
          "message": "Only heading 1, heading 2, heading 3, heading 4, heading 5, heading 6, ordered list, unordered list, horizontal rule, quote, block entry, asset, table, link to Url, link to entry, link to asset, and inline entry nodes are allowed"
        },
        {
          "nodes": {}
        }
      ],
      "disabled": false,
      "omitted": false
    }
  ],
  "sys": {
    "space": { ... },
    "id": "blogPost",
    "type": "ContentType",
    "createdAt": "2023-08-13T13:49:46.647Z",
    "updatedAt": "2023-08-13T13:49:47.052Z",
    "environment": { ... },
    "publishedVersion": 1,
    "publishedAt": "2023-08-13T13:49:47.052Z",
    "firstPublishedAt": "2023-08-13T13:49:47.052Z",
    "createdBy": { ... },
    "updatedBy": { ... },
    "publishedCounter": 1,
    "version": 2,
    "publishedBy": { ... }
  }
}
```
</details>

As we can see when we will start scripting the migration, the field names, values and structure is very similar to what
needs to be defined with the Javascript syntax. Let's first add the content-type data and the basic migration structure:

<details>
    <summary>0027-Add-Blog-Post.cjs</summary>

```js
module.exports = async function (migration, context) {
    const blogPost = migration.createContentType('blogPost', {
        name: 'Blog Post',
        description: 'New Amazing Blog articles',
        displayField: 'title'
    })

    blogPost.createField('title')
        .name('title')
        .type('Symbol')
        .localized(false)
        .required(true)
        .validations([])
        .disabled(false)
        .omitted(false)

    blogPost.createField('slug')
        .name('slug')
        .type('Symbol')
        .localized(false)
        .required(true)
        .validations([
            {
                "unique": true
            }
        ])
        .disabled(false)
        .omitted(false)

    blogPost.createField('post')
        .name('post')
        .type('RichText')
        .localized(false)
        .required(false)
        .validations([
            {
                "enabledMarks": [
                    "bold",
                    "italic",
                    "underline",
                    "code",
                    "superscript",
                    "subscript"
                ],
                "message": "Only bold, italic, underline, code, superscript, and subscript marks are allowed"
            },
            {
                "enabledNodeTypes": [
                    "heading-1",
                    "heading-2",
                    "heading-3",
                    "heading-4",
                    "heading-5",
                    "heading-6",
                    "ordered-list",
                    "unordered-list",
                    "hr",
                    "blockquote",
                    "embedded-entry-block",
                    "embedded-asset-block",
                    "table",
                    "hyperlink",
                    "entry-hyperlink",
                    "asset-hyperlink",
                    "embedded-entry-inline"
                ],
                "message": "Only heading 1, heading 2, heading 3, heading 4, heading 5, heading 6, ordered list, unordered list, horizontal rule, quote, block entry, asset, table, link to Url, link to entry, link to asset, and inline entry nodes are allowed"
            },
            {
                "nodes": {}
            }
        ])
        .disabled(false)
        .omitted(false)


    blogPost.changeFieldControl('slug', 'builtin', 'slugEditor', {
        trackingFieldId: 'title'
    })
}
```
</details>

Now we have our migration, but we don't know if it works correctly or will perform the expected modification. Meanwhile,
linters can help with the syntax and general validity of the Javascript code, it's always good to test the migration 
itself in a new 'clean' Environment, so that we can be sure the automation during deployment will go without problems.
To do that, let's duplicate a new Environment from the original source Environment. Just create a duplicate of 'dev' and
call it `0027-test`. This also allows use to tune the Content-type in the other `0027-dev` Environment, and adjust the
migration till we are satisfied (we can always delete and recreate the `0027-test` Environment, since its sole purpose
is to validate the migration runs smoothly).

Create a file `0027-Add-Blog-Post.cjs` under the folder `migrations/scripts` of your project and then run:

```shell
$ npx contentful-cli-migrations --to 0027-test
```

You should see the following output:

```shell
##/INFO: Applying migrations to environment-id: dev
##/INFO: Latest migration successfully run # 26
The following migration has been planned

Environment: 0027-test

Create Content Type blogPost
  - name: "Blog Post"
  - description: "New Amazing Blog articles"
  - displayField: "title"

  Create field title
    - name: "title"
    - type: "Symbol"
    - localized: false
    - required: true
    - validations: []
    - disabled: false
    - omitted: false

  Create field slug
    - name: "slug"
    - type: "Symbol"
    - localized: false
    - required: true
    - validations: [{"unique":true}]
    - disabled: false
    - omitted: false

  Create field post
    - name: "post"
    - type: "RichText"
    - localized: false
    - required: false
    - validations: [{"enabledMarks":["bold","italic","underline","code","superscript","subscript"],"message":"Only bold, italic, underline, code, superscript, and subscript marks are allowed"},{"enabledNodeTypes":["heading-1","heading-2","heading-3","heading-4","heading-5","heading-6","ordered-list","unordered-list","hr","blockquote","embedded-entry-block","embedded-asset-block","table","hyperlink","entry-hyperlink","asset-hyperlink","embedded-entry-inline"],"message":"Only heading 1, heading 2, heading 3, heading 4, heading 5, heading 6, ordered list, unordered list, horizontal rule, quote, block entry, asset, table, link to Url, link to entry, link to asset, and inline entry nodes are allowed"},{"nodes":{}}]
    - disabled: false
    - omitted: false

Publish Content Type blogPost
Update field controls for Content Type blogPost

  Update field slug
    - widgetId: "slugEditor"
    - widgetNamespace: "builtin"
    - trackingFieldId: "title"
? Do you want to apply the migration (Y/n) 
```

By pressing the `Y` to confirm, we can see the migration being applied:

```shell
✔ Create Content Type blogPost
✔ Update field controls for Content Type blogPost
🎉  Migration successful
##/INFO: Migration 0027-Add-Blog-Post.cjs Done!
```

The migration is now safe to be committed alongside other code of your work. Once the commit is pushed, you can safely
remove both the `0027-dev` and `0027-test` Environments.

## async/await


## makeRequest

* `{ makeRequest }` - See also: https://github.com/contentful/contentful-migration/blob/master/README.md#context

## transformEntries

* how to transform Entries (`transformEntriesPerLocale`)

## Locale-agnostic migrations

* getAllLocalesCode, getDefaultLocaleCode and getDefaultValuesForLocales

