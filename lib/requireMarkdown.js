// Generated by CoffeeScript 1.3.3
(function() {
  var discount, fs, _ref;

  fs = require('fs');

  discount = require('discount');

  if ((_ref = require.extensions) != null) {
    _ref['.md'] = function(module, filename) {
      var md;
      md = fs.readFileSync(filename, 'utf8');
      return module.exports = function(options) {
        if (typeof options === 'number') {
          return discount.parse(md, options);
        } else {
          return discount.parse(md);
        }
      };
    };
  }

}).call(this);