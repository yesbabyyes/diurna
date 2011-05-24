(function() {
  var RESERVED_NAMES, buildPage, buildPages, buildScripts, buildStyles, eco, fs, getLayout, log, markdown, path, read, slugify, stitch, stylus, util, write, _, _verbosity;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  }, __slice = Array.prototype.slice;
  fs = require("fs");
  path = require("path");
  util = require("util");
  markdown = require("markdown");
  eco = require("eco");
  stylus = require("stylus");
  stitch = require("stitch");
  _ = require("underscore");
  _verbosity = 0;
  RESERVED_NAMES = ["styles", "scripts", "404.eco"];
  exports.build = function(from, to, verbosity) {
    var scripts, styles;
    if (verbosity) {
      _verbosity = verbosity;
    }
    scripts = path.join(from, "scripts");
    styles = path.join(from, "styles", "main.styl");
    path.exists(scripts, function(exists) {
      if (exists) {
        return buildScripts(scripts, path.join(to, "scripts", "main.js"));
      }
    });
    path.exists(styles, function(exists) {
      if (exists) {
        return buildStyles(styles, path.join(to, "styles", "main.css"));
      }
    });
    return buildPages(from, to);
  };
  slugify = function(str) {
    var regex, replacement, replaces, slug;
    replaces = {
      'a': /[åäàáâ]/g,
      'c': /ç/g,
      'e': /[éèëê]/g,
      'i': /[ìíïî]/g,
      'u': /[üû]/g,
      'o': /[öô]/g,
      '-': new RegExp(' ', 'g')
    };
    slug = str.toLowerCase();
    for (replacement in replaces) {
      regex = replaces[replacement];
      slug = slug.replace(regex, replacement);
    }
    return slug.replace(/[^\w-\.]/g, '');
  };
  buildPages = function(from, to) {
    var baseLayout, createNode, filenames, pageLayout, parseTitle, root, traverse;
    baseLayout = path.join(from, "layout.eco");
    pageLayout = function(dir, file) {
      var layout;
      layout = path.join(dir, "" + file + ".eco");
      if (path.existsSync(layout)) {
        return layout;
      }
    };
    parseTitle = function(filename) {
      var re;
      re = /^[\d\.-\s]*(.*)/;
      return filename.match(re)[1];
    };
    filenames = function(basename) {
      if (basename === "index") {
        return {
          index: "index.html",
          content: "content.html"
        };
      } else {
        return {
          index: "" + basename + "/index.html",
          content: "" + basename + "/content.html"
        };
      }
    };
    createNode = function(parent, file) {
      var node;
      node = parent.files[file] = {};
      node.title = parseTitle(path.basename(file, path.extname(file)));
      node.path = path.join(parent.path, slugify(node.title));
      return node;
    };
    traverse = function(options, parent) {
      var currentDir, _ref;
            if ((_ref = options.root) != null) {
        _ref;
      } else {
        options.root = parent;
      };
      currentDir = path.join(options.baseDir, parent.path);
      return fs.readdir(currentDir, function(err, files) {
        var basename, context, dirName, dirNames, dst, extension, file, filePath, layouts, node, page, pages, src, _i, _len, _ref2, _ref3, _results;
        if (err) {
          return util.error(err);
        }
        pages = {};
        dirNames = {};
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          if (__indexOf.call(RESERVED_NAMES, file) < 0) {
            filePath = path.join(currentDir, file);
            node = createNode(parent, file);
            extension = path.extname(file);
            if (fs.statSync(filePath).isDirectory()) {
              node.files = [];
              dirNames[file] = node;
            } else if (file === "layout.eco") {
                            if ((_ref2 = parent.layouts) != null) {
                _ref2;
              } else {
                parent.layouts = [];
              };
              parent.layouts.push(filePath);
            } else if (file.match(/\.include\./)) {
              log("include: " + file);
                            if ((_ref3 = parent.includes) != null) {
                _ref3;
              } else {
                parent.includes = [];
              };
              parent.includes.push(file);
            } else if (extension === ".md") {
              log("page: " + file);
              pages[filePath] = node;
            } else {
              src = filePath;
              dst = path.join(options.outDir, parent.path, file);
              fs.link(src, dst, function(err) {
                if (err) {
                  return util.error(err);
                }
                return log("Linked from " + src + " to " + dst);
              });
            }
          }
        }
        for (page in pages) {
          node = pages[page];
          basename = path.basename(page, ".md");
          layouts = parent.layouts || [];
          pageLayout = path.join(currentDir, "" + basename + ".eco");
          if (path.existsSync(pageLayout)) {
            layouts.push(pageLayout);
          }
          context = {};
          _.extend(context, node);
          _.extend(context, {
            parent: parent,
            root: options.root
          });
          buildPage({
            page: page,
            body: markdown.parse(read(page)),
            directory: path.join(options.outDir, parent.path),
            layouts: layouts,
            filenames: filenames(path.basename(node.path)),
            context: context
          });
        }
        _results = [];
        for (dirName in dirNames) {
          node = dirNames[dirName];
          node.layouts = parent.layouts;
          _results.push(traverse(options, node));
        }
        return _results;
      });
    };
    root = {
      name: "__root__",
      path: "",
      files: []
    };
    return traverse({
      baseDir: from,
      outDir: to
    }, root);
  };
  getLayout = _.memoize(function(layout) {
    return require(layout);
  });
  buildPage = function(options) {
    var helpers, html, render;
    helpers = {
      nav: function(node) {
        var key, value, _ref, _results;
        _ref = node.files;
        _results = [];
        for (key in _ref) {
          value = _ref[key];
          if ('files' in value) {
            _results.push(value);
          }
        }
        return _results;
      },
      read: function(file) {
        return read(path.join(options.directory, file));
      }
    };
    render = function(layouts, body) {
      var context, layout, remainingLayouts, _i;
      if (!layouts.length) {
        return body;
      }
      context = {};
      _.extend(context, options.context);
      _.extend(context, helpers);
      context.dirs = helpers.nav(context.root);
      context.siblings = helpers.nav(context.parent);
      if (body != null) {
        context.body = body;
      }
      remainingLayouts = 2 <= layouts.length ? __slice.call(layouts, 0, _i = layouts.length - 1) : (_i = 0, []), layout = layouts[_i++];
      return render(remainingLayouts, getLayout(layout)(context));
    };
    html = render(options.layouts, options.body);
    write(path.join(options.directory, options.filenames.content), options.body, function(err) {
      if (err) {
        return util.error;
      }
    });
    return write(path.join(options.directory, options.filenames.index), html, function(err) {
      if (err) {
        return util.error;
      }
    });
  };
  buildScripts = function(from, to) {
    var package;
    package = stitch.createPackage({
      paths: [from]
    });
    return package.compile(function(err, source) {
      if (err) {
        return util.error(err);
      }
      return write(to, source, function(err) {
        if (err) {
          return util.error(err);
        }
      });
    });
  };
  buildStyles = function(from, to) {
    return fs.readFile(from, "utf8", function(err, str) {
      if (err) {
        return util.error(err);
      }
      return stylus(str).set("filename", from).include(require("nib").path).render(function(err, css) {
        if (err) {
          return util.error(err);
        }
        return write(to, css, function(err) {
          if (err) {
            return util.error(err);
          }
        });
      });
    });
  };
  read = _.memoize(function(file) {
    try {
      return fs.readFileSync(file, "utf8");
    } catch (e) {
      return util.error("Missing file: " + file);
    }
  });
  write = function(file, str, next) {
    return path.exists(file, function(exists) {
      var base, dir, _i, _len, _ref;
      if (!exists) {
        base = "";
        _ref = path.dirname(file).split("/");
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dir = _ref[_i];
          base += "" + dir + "/";
          if (!path.existsSync(base)) {
            log("Creating directory " + base);
            fs.mkdirSync(base, 0755);
          }
        }
      }
      log("Writing file " + file);
      return fs.writeFile(file, str, next);
    });
  };
  log = function() {
    if (_verbosity) {
      return console.log.apply(null, arguments);
    }
  };
}).call(this);
