(function() {
  var fs, path, request, url, _;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  fs = require("fs");
  path = require("path");
  url = require("url");
  request = require("request");
  _ = require("underscore");
  exports.nav = function(root) {
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
  };
  exports.include = function(file) {
    return read(path.join(options.directory, file));
  };
  exports.formatDate = require("dateformat");
  exports.render = function(obj, extraContext) {
    var context;
    context = {};
    _.extend(context, this);
    _.extend(context, obj);
    if (extraContext) {
      _.extend(context, extraContext);
    }
    return require(this.parent.templates[0])(context);
  };
  exports.sort = function(items, field, reverse) {
    var value;
    value = reverse ? -1 : 1;
    return [].concat(items).sort(function(a, b) {
      if (a[field] > b[field]) {
        return value;
      } else if (a[field] < b[field]) {
        return -value;
      } else {
        return 0;
      }
    });
  };
  exports.url = _.memoize(function(path) {
    return "http://" + this.hostname + "/" + (path || "");
  });
  exports.thumbnail = _.memoize(function(file, width, height) {
    var convert, read, thumbnail, thumbnailName;
    if (height == null) {
      height = width;
    }
    thumbnailName = __bind(function(file) {
      var base;
      base = path.join(this.parent.filePath, path.dirname(file), path.basename(file, path.extname(file)));
      return "" + base + "_" + width + "_" + height + ".png";
    }, this);
    if (/^(http(s)?|ftp):\/\//i.test(file)) {
      thumbnail = thumbnailName(url.parse(file).pathname.slice(1).replace(/\//g, "_"));
      read = function(next) {
        return request.get({
          uri: file,
          encoding: "binary"
        }, function(err, response, body) {
          var _ref;
          if (err || !((200 <= (_ref = response.statusCode) && _ref < 400))) {
            return console.error(err, response.statusCode);
          } else {
            return next(new Buffer(body, "binary"));
          }
        });
      };
    } else {
      thumbnail = thumbnailName(file);
      read = function(next) {
        return fs.readFile(file, function(err, data) {
          if (err) {
            return console.error(err);
          }
          return next(data);
        });
      };
    }
    convert = __bind(function(data) {
      var Canvas, canvas, ctx, img, out, ratio, scaledHeight, scaledWidth, stream;
      Canvas = require("canvas");
      img = new Canvas.Image();
      img.src = data;
      ratio = Math.min(width / img.width, height / img.height);
      scaledWidth = ratio * img.width;
      scaledHeight = ratio * img.height;
      canvas = new Canvas(scaledWidth, scaledHeight);
      ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      out = fs.createWriteStream(path.join(this.directory, thumbnail));
      stream = canvas.createPNGStream();
      return stream.on("data", function(chunk) {
        return out.write(chunk);
      });
    }, this);
    read(convert);
    return thumbnail;
  });
}).call(this);
