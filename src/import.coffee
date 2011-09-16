fs     = require "fs"
path   = require "path"
{exec} = require "child_process"

module.exports = (platform, args) ->
  require("./import/#{platform}").import args, (err, result) ->
    return console.error(err) if err

    outDir = path.join(process.cwd(), result.config.hostname)
    fs.mkdirSync outDir, 0755 unless path.existsSync outDir

    fs.writeFileSync path.join(outDir, "#{result.config.hostname}.json"),
      JSON.stringify(result.import), "utf8"

    fs.writeFileSync path.join(outDir, "config.json"),
      JSON.stringify(result.config), "utf8"

    for post in result.posts
      fs.writeFileSync path.join(outDir, post.filename), post.content, "utf8"
      exec "touch --date='#{post.date}' '#{post.filename.replace /'/g, "'\\''"}'", cwd: outDir, (err, stdout, stderr) ->
        console.error stderr if err

    console.log "Imported #{result.posts.length} posts from #{result.config.hostname}"
