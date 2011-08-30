(function() {
  var Posterous, optimist, options, transform, usage;
  usage = 'Usage: $0 --import posterous -- [OPTION]...\nImport posts from a Posterous site.\nExample: $0 --import posterous -- -u user@example.com -p password';
  options = {
    u: {
      alias: "username",
      description: "Posterous username",
      demand: true
    },
    p: {
      alias: "password",
      description: "Posterous password",
      demand: true
    },
    t: {
      alias: "api-token",
      description: "Posterous API token",
      demand: true
    },
    s: {
      alias: "site",
      description: "Site to import",
      "default": "primary"
    },
    l: {
      alias: "list-sites",
      description: "List your Posterous sites",
      boolean: true
    }
  };
  optimist = require("optimist");
  Posterous = require("posterous");
  transform = exports.transform = function(post, index) {
    var hidden;
    hidden = post.draft || post.private ? "." : "";
    return {
      filename: "" + hidden + index + ". @(" + post.slug + ") " + post.title + ".html",
      date: new Date(post.display_date).toUTCString(),
      content: post.body_cleaned || post.body
    };
  };
  exports["import"] = function(args, next) {
    var argv, posterous;
    argv = optimist(args).usage(usage).options(options).argv;
    posterous = new Posterous(argv.u, argv.p, argv.t);
    if (argv.l) {
      return posterous.get("Sites", {}, function(err, sites) {
        var site, _i, _len;
        if (err) {
          return console.error(err);
        }
        console.log("Site id\t-- Site name (hostname)\n");
        for (_i = 0, _len = sites.length; _i < _len; _i++) {
          site = sites[_i];
          console.log("" + site.id + "\t-- " + site.name + " (" + site.full_hostname + ")");
        }
        return console.log("To import: " + (process.argv.join(" ")) + " -i [Site id]");
      });
    } else {
      return posterous.get("Site", argv.s, {}, function(err, site) {
        var config, display_name, firstname, lastname, nickname, profile_pic, _ref;
        if (err) {
          return console.error(err);
        }
        config = {
          name: site.name,
          subhead: site.subhead,
          hostname: site.full_hostname
        };
        _ref = site.admins[0], display_name = _ref.display_name, nickname = _ref.nickname, firstname = _ref.firstname, lastname = _ref.lastname, profile_pic = _ref.profile_pic;
        config.author = {
          display_name: display_name,
          nickname: nickname,
          firstname: firstname,
          lastname: lastname,
          profile_pic: profile_pic
        };
        return posterous.get("Posts", argv.s, {}, function(err, posts) {
          var index, post;
          if (err) {
            return console.error(err);
          }
          site.posts = posts;
          return next(null, {
            config: config,
            "import": site,
            posts: (function() {
              var _len, _results;
              _results = [];
              for (index = 0, _len = posts.length; index < _len; index++) {
                post = posts[index];
                if (post.body || post.body_cleaned) {
                  _results.push(transform(post, posts.length - index));
                }
              }
              return _results;
            })()
          });
        });
      });
    }
  };
}).call(this);
