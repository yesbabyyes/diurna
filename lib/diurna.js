(function() {
  var RESERVED_NAMES, buildPage, buildPages, buildScripts, buildStyles, eco, formatDate, fs, getTemplate, link, log, markdown, mkdirs, path, read, slugify, stitch, stylus, util, write, _, _verbosity;
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
  formatDate = require("dateformat");
  _ = require("underscore");
  _verbosity = 0;
  RESERVED_NAMES = ["styles", "scripts"];
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
    var createNode, filenames, parseTitle, root, traverse;
    parseTitle = function(filename) {
      var re;
      re = /^(?:\d+\s*(?:\.|-)\s*)?(.*)/;
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
      node.name = slugify(node.title);
      node.path = path.join(parent.path, node.name);
      node.filePath = path.join(parent.filePath, file);
      return node;
    };
    traverse = function(options, parent) {
      var currentDir, _ref;
            if ((_ref = options.root) != null) {
        _ref;
      } else {
        options.root = parent;
      };
      currentDir = path.join(options.baseDir, parent.filePath);
      return fs.readdir(currentDir, function(err, files) {
        var basename, context, dirNames, extension, file, filePath, node, page, pageTemplate, pages, stat, templates, _i, _j, _len, _len2, _ref2, _ref3, _results;
        if (err) {
          return util.error(err);
        }
        pages = {};
        dirNames = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          if (__indexOf.call(RESERVED_NAMES, file) < 0) {
            filePath = path.join(currentDir, file);
            log("Processing " + filePath);
            node = createNode(parent, file);
            extension = path.extname(file);
            stat = fs.statSync(filePath);
            node.ctime = stat.ctime;
            node.mtime = stat.mtime;
            if (file.indexOf(".") === 0) {
              log("Skipping " + file);
              continue;
            } else if (stat.isDirectory()) {
              node.type = "directory";
              node.files = [];
              dirNames.push(node);
            } else if (file === "template.eco") {
                            if ((_ref2 = parent.templates) != null) {
                _ref2;
              } else {
                parent.templates = [];
              };
              parent.templates.push(filePath);
            } else if (file.match(/\.include\./)) {
              node.type = "include";
                            if ((_ref3 = parent.includes) != null) {
                _ref3;
              } else {
                parent.includes = [];
              };
              parent.includes.push(file);
            } else if (extension === ".md") {
              node.type = file === "index.md" ? "index" : "page";
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
          basename = path.basename(page, ".md");
          templates = parent.templates ? [].concat(parent.templates) : [];
          pageTemplate = path.join(currentDir, "" + basename + ".eco");
          if (path.existsSync(pageTemplate)) {
            templates.push(pageTemplate);
          }
          context = {};
          _.extend(context, node);
          _.extend(context, {
            parent: parent,
            root: options.root
          });
          buildPage({
            body: markdown.parse(read(page)),
            directory: path.join(options.outDir, parent.path),
            layout: path.join(options.baseDir, "layout.eco"),
            templates: templates,
            filenames: filenames(node.name),
            context: context
          });
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
  getTemplate = _.memoize(function(template) {
    return require(template);
  });
  buildPage = function(options) {
    var body, helpers, html, render;
    helpers = {
      nav: function(root) {
        var key, node, _ref, _ref2, _results;
        _ref = root.files;
        _results = [];
        for (key in _ref) {
          node = _ref[key];
          if ((_ref2 = node.type) === "directory" || _ref2 === "page") {
            _results.push(node);
          }
        }
        return _results;
      },
      include: function(file) {
        return read(path.join(options.directory, file));
      },
      formatDate: formatDate,
      humanDate: function(date) {
        var day, diff, format;
        day = 24 * 60 * 60 * 1000;
        diff = new Date() - date;
        format = diff < day ? "HH:MM" : "yyyy-mm-dd HH:MM";
        return formatDate(date, format);
      }
    };
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
      if (body != null) {
        context.body = body;
      }
      remainingTemplates = 2 <= templates.length ? __slice.call(templates, 0, _i = templates.length - 1) : (_i = 0, []), template = templates[_i++];
      return render(remainingTemplates, getTemplate(template)(context));
    };
    body = render(options.templates, options.body);
    if (path.existsSync(options.layout)) {
      html = render([options.layout], body);
    } else {
      html = body;
    }
    write(path.join(options.directory, options.filenames.content), body, function(err) {
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
      return stylus(str).set("filename", from).set("compress", process.env.NODE_ENV === "production").use(require("nib")())["import"]("nib").render(function(err, css) {
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
