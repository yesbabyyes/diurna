(function() {
  var RESERVED_NAMES, buildPage, buildPages, buildScripts, buildStyles, eco, fs, helpers, link, log, markdown, mkdirs, path, read, slugify, stitch, stylus, util, watchPath, write, _, _verbosity;
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
  helpers = require("./helpers");
  _verbosity = 0;
  RESERVED_NAMES = ["styles", "scripts"];
  exports.skeleton = path.resolve(__dirname, "..", "example");
  exports.build = function(from, to, verbosity, watch) {
    var config, configFile, scripts, styles;
    if (verbosity) {
      _verbosity = verbosity;
    }
    configFile = path.join(from, "config.json");
    config = {};
    if (path.existsSync(configFile)) {
      config = JSON.parse(fs.readFileSync(configFile, "utf8"));
    }
    scripts = path.join(from, "scripts");
    styles = path.join(from, "styles", "main.styl");
    path.exists(scripts, function(exists) {
      var scriptBuilder;
      if (exists) {
        scriptBuilder = function() {
          return buildScripts(scripts, path.join(to, "scripts", "app.js"));
        };
        scriptBuilder();
        if (watch) {
          return watchPath(scripts, scriptBuilder);
        }
      }
    });
    path.exists(styles, function(exists) {
      var stylesBuilder;
      if (exists) {
        stylesBuilder = function() {
          return buildStyles(styles, path.join(to, "styles", "main.css"));
        };
        stylesBuilder();
        if (watch) {
          return watchPath(styles, stylesBuilder);
        }
      }
    });
    return buildPages(config, from, to, watch);
  };
  watchPath = function(path, callback) {
    log("Watching " + path + " for changes");
    return fs.watchFile(path, function(curr, prev) {
      if (curr.mtime > prev.mtime) {
        log("" + path + " has changed, rebuilding");
        return callback();
      }
    });
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
  buildPages = function(config, from, to, watch) {
    var createNode, filenames, parseTitle, processPage, root, traverse;
    parseTitle = function(filename) {
      var re, slug, title, _ref;
      re = /^(?:\d+\s*(?:\.|-)\s*)?(?:@\((.*)\)\s+)?(.*)/;
      _ref = filename.match(re).slice(1), slug = _ref[0], title = _ref[1];
      return [slug || slugify(title), title];
    };
    filenames = function(node) {
      if (node.type === ".xml") {
        return node.name + node.type;
      } else {
        if (node.name === "index") {
          return {
            index: "index.html",
            content: "content.html"
          };
        } else {
          return {
            index: "" + node.name + "/index.html",
            content: "" + node.name + "/content.html"
          };
        }
      }
    };
    createNode = function(parent, file) {
      var name, node, _ref;
      node = parent.files[file] = {};
      node.parent = parent;
      node.type = path.extname(file);
      _ref = parseTitle(path.basename(file, node.type)), node.name = _ref[0], node.title = _ref[1];
      name = node.name === "index" ? "" : node.name;
      node.path = path.join(parent.path, name);
      if (node.path === ".") {
        node.path = "";
      }
      node.filePath = path.join(parent.filePath, file);
      return node;
    };
    processPage = function(filePath, node, options, currentDir) {
      var context, pageTemplate, parent, templates;
      parent = node.parent;
      templates = parent.templates ? [].concat(parent.templates) : [];
      pageTemplate = path.join(currentDir, "" + node.name + ".eco");
      if (path.existsSync(pageTemplate)) {
        templates.push(pageTemplate);
      }
      context = {};
      _.extend(context, node);
      _.extend(context, {
        root: options.root
      });
      _.extend(context, config);
      return buildPage({
        body: node.body,
        directory: path.join(options.outDir, parent.path),
        layout: options.layout,
        templates: templates,
        filename: filenames(node),
        context: context
      });
    };
    traverse = function(options, parent) {
      var currentDir, _ref, _ref2;
      if ((_ref = options.root) == null) {
        options.root = parent;
      }
      if ((_ref2 = options.layout) == null) {
        options.layout = path.join(options.baseDir, "layout.eco");
      }
      currentDir = path.join(options.baseDir, parent.filePath);
      return fs.readdir(currentDir, function(err, files) {
        var dirNames, extension, file, filePath, node, page, pages, stat, _i, _j, _len, _len2, _ref3, _ref4, _results;
        if (err) {
          return util.error(err);
        }
        pages = {};
        dirNames = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          if (__indexOf.call(RESERVED_NAMES, file) < 0) {
            if (file[0] === "." || file[file.length - 1] === "~") {
              log("Skipping " + file);
              continue;
            }
            filePath = path.join(currentDir, file);
            log("Processing " + filePath);
            if (watch) {
              watchPath(filePath, function() {
                return buildPages(config, from, to);
              });
            }
            node = createNode(parent, file);
            extension = path.extname(file);
            stat = fs.statSync(filePath);
            node.ctime = stat.ctime;
            node.mtime = stat.mtime;
            if (stat.isDirectory()) {
              node.type = "directory";
              node.files = [];
              dirNames.push(node);
            } else if (file === "template.eco") {
              if ((_ref3 = parent.templates) == null) {
                parent.templates = [];
              }
              parent.templates.push(filePath);
            } else if (file.match(/\.include\./)) {
              node.type = "include";
              if ((_ref4 = parent.includes) == null) {
                parent.includes = [];
              }
              parent.includes.push(file);
            } else if (extension === ".md") {
              node.type = file === "index.md" ? "index" : "page";
              node.body = markdown.parse(read(filePath));
              pages[filePath] = node;
            } else if (extension === ".html") {
              node.type = file === "index.html" ? "index" : "page";
              node.body = read(filePath);
              pages[filePath] = node;
            } else if (extension === ".xml") {
              node.type = "xml";
              node.body = read(filePath);
              pages[filePath] = node;
            } else if (extension === ".eco") {
              node.type = "template";
            } else {
              link(filePath, path.join(options.outDir, parent.path, file));
            }
          }
        }
        for (page in pages) {
          node = pages[page];
          processPage(page, node, options, currentDir);
        }
        _results = [];
        for (_j = 0, _len2 = dirNames.length; _j < _len2; _j++) {
          node = dirNames[_j];
          node.templates = parent.templates;
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
  buildPage = function(options) {
    var body, html, render;
    render = function(templates, body) {
      var context, remainingTemplates, template, _i;
      if (!templates.length) {
        return body;
      }
      context = {};
      _.extend(context, options.context);
      _.extend(context, helpers);
      context.dirs = helpers.nav(context.root);
      context.siblings = helpers.nav(context.parent);
      context.directory = options.directory;
      if (body != null) {
        context.body = body;
      }
      remainingTemplates = 2 <= templates.length ? __slice.call(templates, 0, _i = templates.length - 1) : (_i = 0, []), template = templates[_i++];
      return render(remainingTemplates, require(template)(context));
    };
    body = render(options.templates, options.body);
    if (path.existsSync(options.layout)) {
      html = render([options.layout], body);
    } else {
      html = body;
    }
    if (options.filename instanceof Object) {
      return write(path.join(options.directory, options.filename.content), body, function(err) {
        if (err) {
          return util.error(err);
        }
        return write(path.join(options.directory, options.filename.index), html, function(err) {
          if (err) {
            return util.error(err);
          }
        });
      });
    } else {
      return write(path.join(options.directory, options.filename), body, function(err) {
        if (err) {
          return util.error(err);
        }
      });
    }
  };
  link = function(src, dst) {
    return path.exists(dst, function(exists) {
      if (!exists) {
        mkdirs(path.dirname(dst));
        return fs.link(src, dst, function(err) {
          if (err) {
            return util.error(err);
          }
          return log("Linked from " + src + " to " + dst);
        });
      }
    });
  };
  buildScripts = function(from, to) {
    var package;
    package = stitch.createPackage({
      paths: [from],
      compress: process.env.NODE_ENV === "production"
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
      return stylus(str).set("filename", from).set("compress", process.env.NODE_ENV === "production").define("url", stylus.url()).use(require("nib")())["import"]("nib").render(function(err, css) {
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
  read = function(file) {
    try {
      return fs.readFileSync(file, "utf8");
    } catch (e) {
      return util.error("Missing file: " + file);
    }
  };
  write = function(file, str, next) {
    return path.exists(file, function(exists) {
      if (!exists) {
        mkdirs(path.dirname(file));
      }
      log("Writing file " + file);
      return fs.writeFile(file, str, next);
    });
  };
  mkdirs = function(pathName) {
    var base, dir, _i, _len, _ref, _results;
    base = "";
    _ref = pathName.split("/");
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      dir = _ref[_i];
      base += "" + dir + "/";
      _results.push(!path.existsSync(base) ? (log("Creating directory " + base), fs.mkdirSync(base, 0755)) : void 0);
    }
    return _results;
  };
  log = function() {
    if (_verbosity) {
      return console.log.apply(null, arguments);
    }
  };
}).call(this);
