(function() {
  var exec, fs, path;
  fs = require("fs");
  path = require("path");
  exec = require("child_process").exec;
  module.exports = function(platform, args) {
    return require("./import/" + platform)["import"](args, function(err, result) {
      var outDir, post, _i, _len, _ref;
      if (err) {
        return console.error(err);
      }
      outDir = path.join(process.cwd(), result.config.hostname);
      if (!path.existsSync(outDir)) {
        fs.mkdirSync(outDir, 0755);
      }
      fs.writeFileSync(path.join(outDir, "" + result.config.hostname + ".json"), JSON.stringify(result["import"]), "utf8");
      fs.writeFileSync(path.join(outDir, "config.json"), JSON.stringify(result.config), "utf8");
      _ref = result.posts;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        post = _ref[_i];
        fs.writeFileSync(path.join(outDir, post.filename), post.content, "utf8");
        exec("touch --date='" + post.date + "' '" + (post.filename.replace(/'/g, "'\\''")) + "'", {
          cwd: outDir
        }, function(err, stdout, stderr) {
          console.log(stdout);
          if (err) {
            return console.error(stderr);
          }
        });
      }
      return console.log("Imported " + result.posts.length + " posts from " + result.config.hostname);
    });
  };
}).call(this);
