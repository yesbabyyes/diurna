(function() {
  var diurna, from, fs, help, opt, path, to;
  path = require("path");
  fs = require("fs");
  opt = require("getopt");
  diurna = require("./diurna");
  help = function() {
    opt.showHelp("Usage:", function(o) {
      switch (o) {
        case "h":
          return "Show this help";
        case "o":
          return ["out_dir", "Output directory (defaults to current directory)"];
        default:
          return "Option '" + o + "'";
      }
    });
    return 0;
  };
  opt.setopt("o:h", process.argv);
  if (opt.params().length < 3) {
    return help();
  }
  from = opt.params().pop();
  to = process.cwd();
  opt.getopt(function(opt, param) {
    switch (opt) {
      case "h":
        return help();
      case "o":
        return to = param[0];
    }
  });
  diurna.build(from, to);
}).call(this);
