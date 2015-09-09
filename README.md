# StaticSmith

[![Build Status](https://travis-ci.org/codePile/StaticSmith.svg)](https://travis-ci.org/codePile/StaticSmith) [![Dependency Status](https://www.versioneye.com/user/projects/55ef38221e87ad001400002d/badge.svg?style=flat)](https://www.versioneye.com/user/projects/55ef38221e87ad001400002d) [![Code Climate](https://codeclimate.com/github/codePile/StaticSmith/badges/gpa.svg)](https://codeclimate.com/github/codePile/StaticSmith)

An extremely simple, _modular_ static site generator forked from [metalsmith](https://github.com/segmentio/metalsmith) which was originaly built by those awesome peps at [Segment](https://segment.com/). StaticSmith was forked (from metalsmith v1.7.0) and re-configured for use by the Single Page Application / Content Management System (SPA/CMS) [OceanPress](https://oceanpress.io) - A [codePile.PBC](http://codepile.org) project.

## Current Release Status: *v[TBA]*
### Stable Production Release:
>`StaticSmith v[TBA]` is the current **stable/production** series on the `master` branch released on [TBA].
>You can learn about what is new with `StaticSmith v[TBA]` in our [Release Announcements](http://OceanPress.io/release-announcements/) or bullet-ed in the [HISTORY.md](https://github.com/codePile/StaticSmith/blob/master/History.md)

### Beta Quality Build:
>`StaticSmith v[TBA]` is the current **beta** series on the `develop` branch and the release as a production build is scheduled for [TBA]. Information about whats new in this version can be viewed in the in the [HISTORY.md](https://github.com/codePile/StaticSmith/blob/develop/History.md)

---

In StaticSmith, all of the logic is handled by plugable modues. You simply chain them together. Here's what the simplest blog looks like...

```js
StaticSmith(__dirname)
  .use(markdown())
  .use(templates('handlebars'))
  .build(function(err) {
    if (err) throw err;
  });
```

...but what if you want to get fancier by hiding your unfinished drafts and using custom permalinks? Just add another module...

```js
StaticSmith(__dirname)
  .use(drafts())
  .use(markdown())
  .use(permalinks('posts/:title'))
  .use(templates('handlebars'))
  .build(function(err) {
    if (err) throw err;
  });
```

...it's as easy as that!


## Installation

    $ npm install @codepile/staticsmith


## Modules

Check out the developer hub for a list of [modules](http://#).


## How does it work?

StaticSmith works in three simple steps:

  1. Read all the files in a source directory.
  2. Invoke a series of modules that manipulate the files.
  3. Write the results to a destination directory!

Each module is invoked with the contents of the source directory, and each file can contain YAML front-matter that will be attached as metadata, so a simple file like...

    ---
    title: A Catchy Title
    date: 2014-12-01
    ---
    
    An informative article.
  
  ...would be parsed into...

```js
{
  'path/to/my-file.md': {
    title: 'A Catchy Title',
    date: new Date('2014-12-01'),
    contents: new Buffer('An informative article.')
  }
}
```

...which any of the modules can then manipulate however they want. And writing the modules is incredibly simple, just take a look at the [example drafts module](TODO).

Of course they can get a lot more complicated too. That's what makes StaticSmith powerful; the modules can do anything you want!


## CLI

In addition to a simple [Javascript API](#api), the StaticSmith CLI can read configuration from a `staticsmith.json` file, so that you can build static-site generators easily. The example blog above would be configured like this:

```json
{
  "source": "../content",
  "destination": "../_public",
  "modules": {
    "staticsmith-drafts": true,
    "staticsmith-markdown": true,
    "staticsmith-permalinks": "posts/:title",
    "staticsmith-templates": "handlebars"
  }
}
```

And then just install `staticsmith` and the modules and run the staticsmith CLI...

    $ node_modules/.bin/staticsmith
      
        StaticSmith · reading configuration from: /path/to/staticsmith.json
        StaticSmith · successfully built to: /path/to/build

Or if you install them globally, you can just use:

    $ staticsmith
      
        StaticSmith · reading configuration from: /path/to/staticsmith.json
        StaticSmith · successfully built to: /path/to/build


If you want to use a custom module, but feel like it's too domain-specific to
be published to the world, you can include them as local npm modules:
(simply use a relative path from your root directory)

```json
{
  "modules": {
    "./lib/staticsmith/module.js": true
  }
}
```


#### new StaticSmith(dir)

Create a new `StaticSmith` instance for a working `dir`.

#### #use(module)

Add the given `module` function to the middleware stack. StaticSmith uses
[ware](https://github.com/segmentio/ware) to support middleware, so modules
should follow the same pattern of taking arguments of `(files, metadata, callback)`,
modifying the `files` or `metadata` argument by reference, and then
calling `callback` to trigger the next step.

#### #build(fn)

Build with the given settings and call `fn(err, files)`.

#### #source(path)

Set the relative `path` to the source directory, or get the full one if no `path` is provided. The source directory defaults to `../content`.

#### #destination(path)

Set the relative `path` to the destination directory, or get the full one if no `path` is provided. The destination directory defaults to `../public`.

#### #concurrency(max)

Set the maximum number of files to open at once when reading or writing.  Defaults to `Infinity`.  To avoid having too many files open at once (`EMFILE` errors), set the concurrency to something lower than `ulimit -n`.

#### #clean(boolean)

Set whether to remove the destination directory before writing to it, or get the current setting. Defaults to `true`.

#### #ignore(path)

Ignore files from being loaded into StaticSmith. `file` can be a string,
or an array of files. Glob syntax is supported via
[minimatch](https://github.com/isaacs/minimatch).

#### #metadata(json)

Get the global metadata. This is useful for modules that want to set global-level metadata that can be applied to all files.

#### #path(paths...)
 
Resolve any amount of `paths...` relative to the working directory. This is useful for modules who want to read extra assets from another directory, for example `./templates`.

#### #run(files, fn)

Run all of the middleware functions on a dictionary of `files` and callback with `fn(err, files)`, where `files` is the altered dictionary.


## Metadata API

Add metadata to your files to access these build features. By default, StaticSmith uses a few different metadata fields:

- `contents` - The body content of the file, not including any [YAML frontmatter](https://middlemanapp.com/basics/frontmatter/).
- `mode` - The numeric version of the [file's mode](http://en.wikipedia.org/wiki/Modes_%28Unix%29).

You can add your own metadata in two ways:

- Using [YAML frontmatter](https://middlemanapp.com/basics/frontmatter/) at the top of any file.
- Enabling [a module](https://TODO) that adds metadata programmatically.

#### mode

Set the mode of the file. For example,

```
$ cat cleanup.sh

--
mode: 0764
--

rm -rf .
```

would be built with mode ```-rwxrw-r--```, i.e. user-executable.

---
## Todo's's, Bugs, Requests, Security, Oh My!:
**Have a Feature Request?** [Suggest it at our UserVoice page](https://oceanpress.uservoice.com). Peers can vote vote on your awesome idea and if it is a popular request, we'll implement it and you can follow its progress on our [Waffle Board](https://oceanpress.waffle.io)

**Found A Bug?** [Give us a holler](https://github.com/codePile/OceanPress/issues/new) on our issues page and if your `in the need to know whats going down`? Check out our [Waffle Board](https://waffle.io/oceanpress/OceanPress) - You'll see the noise you created and track it in reall time. Our policy is Transparency, Transparency, Transparency!

**Security:** Here at codePile.PBC, we are committed to working with security experts across the world to stay up to date with the latest security techniques and participates in `HackerOne`. The codePile cooperative may pay out for various issues reported there. You can find out more information on our [HackerOne page](https://hackerone.com/codePile).

---
**StaticSmith** is a product of **OceanPress** - A registered trademark maintained by [codePile.PBC](http://codepile.org) & its [contributors](https://github.com/codePile/OceanPress/graphs/contributors) | **codePile.PBC** is a public benefit company ([PBC](http://en.wikipedia.org/wiki/Public-benefit_corporation)) operating as a consumer/worker (web-technology) [cooperative](http://en.wikipedia.org/wiki/Consumer_cooperative).
