(function() {
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
  exports.humanDate = function(date) {
    var day, diff, format;
    day = 24 * 60 * 60 * 1000;
    diff = new Date() - date;
    format = diff < day ? "HH:MM" : "yyyy-mm-dd HH:MM";
    return formatDate(date, format);
  };
}).call(this);
