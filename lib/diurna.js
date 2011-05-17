(function() {
  var buildPage, buildPages, buildScripts, buildStyles, eco, fs, log, markdown, path, read, stitch, stylus, util, write, _, _verbosity;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  fs = require("fs");
  path = require("path");
  util = require("util");
  markdown = require("markdown");
  eco = require("eco");
  stylus = require("stylus");
  stitch = require("stitch");
  _ = require("underscore");
  _verbosity = 0;
  exports.build = function(from, to, verbosity) {
    var scripts, styles;
    _verbosity = verbosity;
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
  buildPages = function(from, to) {
    var baseLayout, outFileNames, pageLayout, traverse;
    baseLayout = path.join(from, "layout.eco");
    pageLayout = function(dir, file) {
      var layout;
      layout = path.join(dir, "" + file + ".eco");
      if (path.existsSync(layout)) {
        return layout;
      }
    };
    outFileNames = function(basename) {
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
    traverse = function(baseDir, outDir) {
      return fs.readdir(baseDir, function(err, files) {
        var basename, dir, dirNames, file, includes, page, pages, _i, _j, _k, _len, _len2, _len3, _results;
        if (err) {
          return util.error(err);
        }
        pages = [];
        dirNames = [];
        includes = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          if (fs.statSync(path.join(baseDir, file)).isDirectory()) {
            dirNames.push(file);
          } else if (__indexOf.call(file, ".include.") >= 0) {
            includes.push(file);
          } else if (path.extname(file) === ".md") {
            pages.push(file);
          }
        }
        for (_j = 0, _len2 = pages.length; _j < _len2; _j++) {
          page = pages[_j];
          basename = path.basename(page, ".md");
          buildPage({
            page: path.join(baseDir, page),
            layout: baseLayout,
            pageLayout: pageLayout(baseDir, basename),
            directory: outDir,
            fileNames: outFileNames(basename),
            context: {
              dirs: dirNames,
              pages: pages
            }
          });
        }
        _results = [];
        for (_k = 0, _len3 = dirNames.length; _k < _len3; _k++) {
          dir = dirNames[_k];
          _results.push(traverse(path.join(baseDir, dir), path.join(outDir, dir)));
        }
        return _results;
      });
    };
    return traverse(from, to);
  };
  buildPage = function(options) {
    var body, content, html, render;
    render = function(layout, body) {
      var context;
      context = _.extend(options.context, {
        body: body,
        read: function(file) {
          return read(path.join(options.directory, file));
        }
      });
      return eco.render(read(layout), context);
    };
    content = markdown.parse(read(options.page));
    body = options.pageLayout ? render(options.pageLayout, content) : content;
    html = render(options.layout, body);
    write(path.join(options.directory, options.fileNames.content), body, function(err) {
      if (err) {
        return util.error;
      }
    });
    return write(path.join(options.directory, options.fileNames.index), html, function(err) {
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
