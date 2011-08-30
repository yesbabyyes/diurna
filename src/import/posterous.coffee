usage = '''Usage: $0 --import posterous -- [OPTION]...
Import posts from a Posterous site.
Example: $0 --import posterous -- -u user@example.com -p password'''

options =
  u:
    alias: "username"
    description: "Posterous username"
    demand: true
  p:
    alias: "password"
    description: "Posterous password"
    demand: true
  t:
    alias: "api-token"
    description: "Posterous API token"
    demand: true
  s:
    alias: "site"
    description: "Site to import"
    default: "primary"
  l:
    alias: "list-sites"
    description: "List your Posterous sites"
    boolean: true

optimist = require "optimist"
Posterous = require "posterous"

transform = exports.transform = (post, index) ->
  hidden = if post.draft or post.private then "." else ""

  filename: "#{hidden}#{index}. @(#{post.slug}) #{post.title}.html"
  date: new Date(post.display_date).toUTCString()
  content: post.body_cleaned or post.body

exports.import = (args, next) ->
  argv = optimist(args)
          .usage(usage)
          .options(options)
          .argv

  posterous = new Posterous argv.u, argv.p, argv.t

  if argv.l
    posterous.get "Sites", {}, (err, sites) ->
      return console.error(err) if err

      console.log "Site id\t-- Site name (hostname)\n"
      for site in sites
        console.log "#{site.id}\t-- #{site.name} (#{site.full_hostname})"

      console.log "To import: #{process.argv.join " "} -i [Site id]"
  else
    posterous.get "Site", argv.s, {}, (err, site) ->
      return console.error(err) if err

      config =
        name: site.name
        subhead: site.subhead
        hostname: site.full_hostname

      {display_name, nickname, firstname, lastname, profile_pic} = site.admins[0]
      config.author = {display_name, nickname, firstname, lastname, profile_pic}

      posterous.get "Posts", argv.s, {}, (err, posts) ->
        return console.error(err) if err

        site.posts = posts

        next null,
          config: config
          import: site
          posts: (transform post, posts.length - index for post, index in posts when post.body or post.body_cleaned)
