(function() {
  var path;
  path = require("path");
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
    var context, _;
    _ = require("underscore");
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
}).call(this);
