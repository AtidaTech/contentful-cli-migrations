[![License: MIT](https://img.shields.io/github/license/AtidaTech/contentful-cli-migrations)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/contentful-cli-migrations)](https://npmjs.com/package/contentful-cli-migrations)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/AtidaTech/contentful-cli-migrations)
![Downloads](https://img.shields.io/npm/dw/contentful-cli-migrations)
![Forks](https://img.shields.io/github/forks/AtidaTech/contentful-cli-migrations)
[![Bun.sh](https://img.shields.io/badge/bun.sh-compatible-orange)](https://bun.sh)

# Contentful CLI Migrations

Contentful CLI Migrations is a JavaScript open-source library for automating Contentful migrations. It provides a convenient way to manage and apply migrations to your Contentful space using the command line.

> Note: This is NOT the official Contentful Migration tool, but it's based on it. That can be found on [GitHub 🔗](https://github.com/contentful/contentful-migration) or [NpmJS 🔗](https://www.npmjs.com/package/contentful-migration)

<h3>Sponsored by <a href="https://github.com/AtidaTech"><b>Atida</b> <img src="https://avatars.githubusercontent.com/u/127305035?s=200&v=4" width="14px;" alt="Atida" /></a></h3>

<hr />

[✨ Features](#-features) · [💡 Installation](#-installation) · [📟 Example](#-example) · [🎹 Usage](#-usage) · [🐦 Write Migrations](#-write-migrations) · [📅 ToDo](#-todo) · [👾 Contributors](#-contributors) · [🎩 Acknowledgments](#-acknowledgements) · [📄 License](#-license)

<hr />

## ✨ Features

- **Automated Migrations**: Easily define and execute migrations to apply changes to your Contentful space.
- **Command Line Interface**: Use a command-line interface to run migrations and manage the migration process.
- **Configuration**: Define migration settings and options using a configuration file or command-line arguments.
- **Environment Integration**: Seamlessly integrate migrations into your development and deployment workflow.
- **Version Control**: Track and manage migrations using version control systems like Git.
- **Extensible**: Customize and extend the migration functionality to suit your specific needs.

## 💡 Installation

To use this helper library, you must have [NodeJS 🔗](https://nodejs.org/) and [npm 🔗](http://npmjs.org) installed.

To install it, simply run:

``````shell
npm install contentful-cli-migrations --save
``````

Or, if using [yarn 🔗](https://yarnpkg.com/lang/en/):

```shell
yarn add contentful-cli-migrations
```

> Similarly, if you are using [Bun 🔗](https://bun.sh), just run<br />`bun add contentful-cli-migrations`

### Requirements

* `node` >= 16.0.0
* `npm` >= 8.19.4
* `contentful-management` >= 7.50.0
* `contentful-migration` ^4.9.4
* [contentful-lib-helpers](https://www.npmjs.com/package/contentful-lib-helpers) >= 0.2.0


### Set-up

1. Create a `migrations/scripts/` directory in your project. This directory will contain your migration scripts.
2. Define your migration scripts inside the `migrations/scripts/` directory. Each migration script should be as follows:
   * Be a separate file with a specific naming convention, such as `0001-migration.cjs`, `0002-migration.cjs`, and so on.
   * The migration file names should contain a progressive number and a dash (`-`). In this way the script can intercept them.
   * We recommend using a certain amount of leading zeros to keep the migration in order inside the folder (that's why is `0001-` and not `1-`).
   * The folder should not contain any migration with a duplicated number (`0002` and `02` will be considered duplicated).
   * Migration file's extension should be `.js` or `.cjs` depending on the use of `"type": "module"` in your package.json. 
3. In Contentful, you will need what we call a 'Counter' entry. It means that you will need to create an entry and assign one of its field to register the latest migration that has run successfully.
   * You will need to take note of the entry-id;
   * Then the field id. We recommend a content-type with very few fields.
   * And finally the locale of that field. If unsure, you should set it up as the default Locale, usually `en-US` or `en-GB`.
   > Note: the entry can stay in 'draft' status, since it doesn't need to be published to be used.
4. Set up your `.env`/`.env.local` configuration file to specify the required environment and migration settings. The configuration options include:
   * `CMS_MANAGEMENT_TOKEN`: The Contentful CMA token for accessing your Contentful space.
   * `CMS_SPACE_ID`: The ID of your Contentful space.
   * `CMS_MIGRATIONS_DIR`: The path to the migrations directory in your project.
   * `CMS_MIGRATIONS_COUNTER_ID`: The ID of the entry used to store the migration counter.
   * `CMS_MIGRATIONS_COUNTER_FIELD`: The ID of the field in the counter entry that stores the actual migration counter.
   * `CMS_MIGRATIONS_COUNTER_LOCALE`: The locale used to retrieve the migration counter from the field.
   
   You can define these options in a configuration file (e.g., .env) or pass them as command-line arguments when running the migrations.

When you start your project with contentful you usually start with an empty `master` environment. We have few advices on how to keep the migrations as clean as possible for different environments:

* Set-up in your environment your default locale (ie: `en-US`) and eventually additional locales.
* If possible, duplicate immediately the empty `master` environment as a new environment (ie: `empty-DO-NOT-DELETE`). This will ensure a clean environment where you could run a Contentful import or the migrations.
* After that, create a content-type of type key-value for the Counter Entry. Or run the script with `--initialise` to set up the counter content-type and entry for you.  
* Once the Counter entry is created in the `master` environment, take note of the entry-id, field-id and locale. When duplicating `master` for your `dev` or `staging` environments, these values will remain the same (so you won't have to get confused with different values for different environments).
* Ideally you should start creating all the Content-types using only migration scripts. Together with the empty environment, this will ensure the possibility to have a clean history of your Content-types.

## 📟 Example

Once everything is set-up, running migrations is actually pretty simple

```shell
npx contentful-cli-migrations --to "<environment-id>"
```

The `--to` (or `--environment-id`) is the only mandatory command line option. And it tells the environment to apply the migrations 'to'.

Since the management token would give you access to all environments, there is no default environment value in the `.env` file, forcing you to specify the target environment for 'safety' reasons (surely you don't want to run them on `master` accidentally).

## 🎹 Usage

This script can be used from the command line and accepts various arguments for customization:

* `--to` or `--environment-id` [MANDATORY]: The environment id to which migrations will be executed.
* `--space-id`: The Contentful space id.
* `--management-token` or `--mt`: The Contentful Management Token.
* `--migrations-dir`: To specify a custom directory for the migrations (default is sub-directory `CMS_MIGRATIONS_DIR` or `migrations/scripts` in your project root). The script will exit if this custom folder doesn't exist.
* `--initialise`: This might be needed the first time to 'override' trying to read a Content-type and an Entry that don't exist yet. If you already have your environment set up, you can just create a counter entry of one of your existing Content-types, and skip this option.
* `--counter-id`: The ID of the entry used to store the migration counter.
* `--counter-field`: The ID of the field in the counter entry that stores the actual migration counter. Example: `title`.
* `--counter-locale`: The locale used to retrieve the migration counter from the field. Default: `en-US`
* `--force-yes`: The script runs a migration at a time, asking you to confirm it manually (Y/N). In a CD/CI pipeline, you will need to set up `--force-yes` so that all migrations will run without any request for interaction.

## 🐦 Write migrations

There are some guidelines and some few tricks that can be implemented when writing a Contentful migration. For more info, look at the separate documentation on [How to Write Migrations](README-migrations.md).

## 📅 Todo

* Add Rollback migrations support.
* Add Migration Diff and automatic generator.
* Add better logging (+ colors).
* Add tests.

## 👾 Contributors

<table>
  <tr>
    <td align="center"><a href="https://github.com/fciacchi"><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/58506?v=4&h=100&w=100&fit=cover&mask=circle&maxage=7d" width="100px;" alt="Fabrizio Ciacchi" /><br /><sub><b>@fciacchi</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/psyvic"><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/29251597?v=4&h=100&w=100&fit=cover&mask=circle&maxage=7d" width="100px;" alt="Victor Hugo Aizpuruo" /><br /><sub><b>@psyvic</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/aalduz"><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/11409770?v=4&h=100&w=100&fit=cover&mask=circle&maxage=7d" width="100px;" alt="Aldo Fernández" /><br /><sub><b>@aalduz</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/leslyto"><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/4264812?v=4&h=100&w=100&fit=cover&mask=circle&maxage=7d" width="100px;" alt="Stefan Stoev" /><br /><sub><b>@leslyto</b></sub></a><br /></td>
  </tr>
</table>
<br />

### Contributions
Feel free to open issues or pull requests in our GitHub Repository if you have suggestions or improvements to propose.

## 🎩 Acknowledgements

I would like to express my gratitude to the following parties:

- [Atida 🔗](https://www.atida.com/), the company that has allowed these scripts to be open sourced. Atida is an e-commerce platform that sells beauty and medical products. Their support for open source is greatly appreciated. A special thank to <a href="https://github.com/shoopi"><img src="https://images.weserv.nl/?url=avatars.githubusercontent.com/u/1385372?v=4&h=16&w=16&fit=cover&mask=circle&maxage=7d" width="16px;" alt="Shaya Pourmirza" /> Shaya Pourmirza</a> that has been a great promoter and supporter of this initiative inside the company.
- [Contentful 🔗](https://www.contentful.com/), for creating their excellent content management platform and the JavaScript CMA SDK that this library is built on. Without their work, this project would not be possible.

Thank you to everyone involved!

## 📄 License
This project is licensed under the [MIT License](LICENSE)

# 📚 Other Scripts in the same collection

We produce a bunch of interesting packages for Contentful. You might want to check them out:

* **Contentful Lib Helpers**: on [GitHub](https://github.com/AtidaTech/contentful-lib-helpers/) and [NpmJS](https://www.npmjs.com/package/contentful-lib-helpers)
* **Contentful CLI Export**: on [GitHub](https://github.com/AtidaTech/contentful-cli-export/) and [NpmJS](https://www.npmjs.com/package/contentful-cli-export)
* **Contentful CLI Migrations**: on [GitHub](https://github.com/AtidaTech/contentful-cli-migrations/) and [NpmJS](https://www.npmjs.com/package/contentful-cli-migrations)