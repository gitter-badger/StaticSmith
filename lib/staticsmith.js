/**
 * StaticSmith Engine
 * An extremely simple, pluggable static site generator for use
 * by the SPA/CMS OceanPress - A codePile.PBC project.
 *
 * Original foundation by: Ben Plum <https://github.com/segmentio> -  
 * Original source: <https://github.com/segmentio/metalsmith>.
 * @since v1.7.0
 *
 * @see http:///TODO
 *
 *
 * @author Jason Alan Kennedy <https://github.com/CelticParser>
 * @Link https://github.com/codePile/StaticSmith
 * @license http://opensource.org/licenses/GPL-3.0
 * Copyright (c) 2015 codePile.PBC
 *
 * @since StaticSmith v1.0.0
 *
 */

/*jshint esnext: true */

var absolute  = require('absolute')
  , assert    = require('assert')
  , clone     = require('clone')
  , fs        = require('co-fs-extra')
  , is        = require('is')
  , matter    = require('gray-matter')
  , Mode      = require('stat-mode')
  , path      = require('path')
  , readdir   = require('recursive-readdir')
  , rm        = require('rimraf')
  , thunkify  = require('thunkify')
  , unyield   = require('unyield')
  , utf8      = require('is-utf8')
  , Ware      = require('ware');

/**
 * Thunks.
 */
readdir = thunkify(readdir);
rm      = thunkify(rm);

/**
 * Export `StaticSmith`.
 */
module.exports = StaticSmith;

/**
 * Initialize a new `StaticSmith` builder with a working `directory`.
 *
 * @param {String} directory
 */
function StaticSmith(directory) {
  if (!(this instanceof StaticSmith)) {
    return new StaticSmith(directory);
  }
  assert(directory, 'You must pass a working directory path.');
  this.modules = [];
  this.ignores = [];
  this.directory(directory);
  this.metadata({});
  this.source('../content');
  this.destination('../_public');
  this.concurrency(Infinity);
  this.clean(true);
  this.frontmatter(true);
}

/**
 * Add a `module` function to the stack.
 *
 * @param {Function or Array} module
 * @return {StaticSmith}
 */
StaticSmith.prototype.use = function(module) {
  this.modules.push(module);
  return this;
};

/**
 * Get or set the working `directory`.
 *
 * @param {Object} directory
 * @return {Object or StaticSmith}
 */
StaticSmith.prototype.directory = function(directory) {
  if (!arguments.length) {
    return path.resolve(this._directory);
  }
  assert(is.string(directory), 'You must pass a directory path string.');
  this._directory = directory;
  return this;
};

/**
 * Get or set the global `metadata` to pass to templates.
 *
 * @param {Object} metadata
 * @return {Object or StaticSmith}
 */
StaticSmith.prototype.metadata = function(metadata) {
  if (!arguments.length) {
    return this._metadata;
  }
  assert(is.object(metadata), 'You must pass a metadata object.');
  this._metadata = clone(metadata);
  return this;
};

/**
 * Get or set the source directory.
 *
 * @param {String} path
 * @return {String or StaticSmith}
 */
StaticSmith.prototype.source = function(path) {
  if (!arguments.length) {
    return this.path(this._source);
  }
  assert(is.string(path), 'You must pass a source path string.');
  this._source = path;
  return this;
};

/**
 * Get or set the destination directory.
 *
 * @param {String} path
 * @return {String or StaticSmith}
 */
StaticSmith.prototype.destination = function(path) {
  if (!arguments.length) {
    return this.path(this._destination);
  }
  assert(is.string(path), 'You must pass a destination path string.');
  this._destination = path;
  return this;
};

/**
 * Get or set the maximum number of files to open at once.
 *
 * @param {Number} max
 * @return {Number or StaticSmith}
 */
StaticSmith.prototype.concurrency = function(max) {
  if (!arguments.length) {
    return this._concurrency;
  }
  assert(is.number(max), 'You must pass a number for concurrency.');
  this._concurrency = max;
  return this;
};

/**
 * Get or set whether the destination directory will be removed before writing.
 *
 * @param {Boolean} clean
 * @return {Boolean or StaticSmith}
 */
StaticSmith.prototype.clean = function(clean) {
  if (!arguments.length) {
    return this._clean;
  }
  assert(is.boolean(clean), 'You must pass a boolean.');
  this._clean = clean;
  return this;
};

/**
 * Optionally turn off frontmatter parsing.
 *
 * @param {Boolean} frontmatter
 * @return {Boolean or StaticSmith}
 */
StaticSmith.prototype.frontmatter = function(frontmatter) {
  if (!arguments.length) {
    return this._frontmatter;
  }
  assert(is.boolean(frontmatter), 'You must pass a boolean.');
  this._frontmatter = frontmatter;
  return this;
};

/**
 * Add a file or files to the list of ignores.
 *
 * @param {String or Strings} The names of files or directories to ignore.
 * @return {StaticSmith}
 */
StaticSmith.prototype.ignore = function(files) {
  if (!arguments.length) {
    return this.ignores.slice();
  }
  this.ignores = this.ignores.concat(files);
  return this;
};

/**
 * Resolve `paths` relative to the root directory.
 *
 * @param {String} paths...
 * @return {String}
 */
StaticSmith.prototype.path = function() {
  var paths = [].slice.call(arguments);
  paths.unshift(this.directory());
  return path.resolve.apply(path, paths);
};

/**
 * Build with the current settings to the destination directory.
 *
 * @return {Object}
 */
StaticSmith.prototype.build = unyield(function*() {
  var clean = this.clean()
    , dest  = this.destination();
  if (clean) {
    yield rm(dest);
  }

  var files = yield this.read();
  files = yield this.run(files);
  yield this.write(files);
  return files;
});

/**
 * Run a set of `files` through the modules stack.
 *
 * @param {Object} files
 * @param {Array} modules
 * @return {Object}
 */
StaticSmith.prototype.run = unyield(function*(files, modules) {
  var ware = new Ware(modules || this.modules)
    , run  = thunkify(ware.run.bind(ware))
    , res  = yield run(files, this);
  return res[0];
});

/**
 * Read a dictionary of files from a `dir`, parsing frontmatter. If no directory
 * is provided, it will default to the source directory.
 *
 * @param {String} dir (optional)
 * @return {Object}
 */
StaticSmith.prototype.read = unyield(function*(dir) {
  dir = dir || this.source();
  var read        = this.readFile.bind(this)
    , concurrency = this.concurrency()
    , ignores     = this.ignores || null
    , paths       = yield readdir(dir, ignores)
    , files       = []
    , complete    = 0
    , batch;

  while (complete < paths.length) {
    batch    = paths.slice(complete, complete + concurrency);
    batch    = yield batch.map(read);
    files    = files.concat(batch);
    complete += concurrency;
  }

  return paths.reduce(memoizer, {});

  function memoizer(memo, file, i) {
    file = path.relative(dir, file);
    memo[file] = files[i];
    return memo;
  }
});

/**
 * Read a `file` by path. If the path is not absolute, it will be resolved
 * relative to the source directory.
 *
 * @param {String} file
 * @return {Object}
 */
StaticSmith.prototype.readFile = unyield(function*(file) {
  var src = this.source()
    , ret = {};

  if (!absolute(file)) {
    file = path.resolve(src, file);
  }

  try {
    var frontmatter = this.frontmatter()
      , stats  = yield fs.stat(file)
      , buffer = yield fs.readFile(file)
      , parsed;

    if (frontmatter && utf8(buffer)) {
      try {
        parsed = matter(buffer.toString());
      }
      catch (e) {
        var err  = new Error('Invalid frontmatter in the file at: ' + file);
        err.code = 'invalid_frontmatter';
        throw err;
      }

      ret = parsed.data;
      ret.contents = new Buffer(parsed.content);
    }
    else {
      ret.contents = buffer;
    }

    ret.mode = Mode(stats).toOctal();
    ret.stats = stats;
  }
  catch (e) {
    if (e.code === 'invalid_frontmatter') {
      throw e;
    }
    e.message = 'Failed to read the file at: ' + file + '\n\n' + e.message;
    e.code    = 'failed_read';
    throw e;
  }

  return ret;
});

/**
 * Write a dictionary of `files` to a destination `dir`. If no directory is
 * provided, it will default to the destination directory.
 *
 * @param {Object} files
 * @param {String} dir (optional)
 */
StaticSmith.prototype.write = unyield(function*(files, dir) {
  dir = dir || this.destination();
  var write       = this.writeFile.bind(this)
    , concurrency = this.concurrency()
    , keys        = Object.keys(files)
    , complete    = 0
    , batch;

  while (complete < keys.length) {
    batch = keys.slice(complete, complete + concurrency);
    yield batch.map(writer);
    complete += concurrency;
  }

  function writer(key) {
    var file = path.resolve(dir, key);
    return write(file, files[key]);
  }
});

/**
 * Write a `file` by path with `data`. If the path is not absolute, it will be
 * resolved relative to the destination directory.
 *
 * @param {String} file
 * @param {Object} data
 */
StaticSmith.prototype.writeFile = unyield(function*(file, data) {
  var dest = this.destination();
  if (!absolute(file)) {
    file = path.resolve(dest, file);
  }

  try {
    yield fs.outputFile(file, data.contents);
    if (data.mode) {
      yield fs.chmod(file, data.mode);
    }
  }
  catch (e) {
    e.message = 'Failed to write the file at: ' + file + '\n\n' + e.message;
    throw e;
  }
});