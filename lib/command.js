(function() {
  var cwd, diurna, from, fs, help, opt, path, to, verbosity;
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
        case "v":
          return "Verbose";
        default:
          return "Option '" + o + "'";
      }
    });
    return 0;
  };
  opt.setopt("o:hv", process.argv);
  if (opt.params().length < 3) {
    return help();
  }
  to = cwd = process.cwd();
  from = path.join(cwd, opt.params().pop());
  verbosity = 0;
  opt.getopt(function(opt, param) {
    switch (opt) {
      case "h":
        return help();
      case "o":
        return to = param[0];
      case "v":
        return verbosity = param;
    }
  });
  diurna.build(from, to, verbosity);
}).call(this);
