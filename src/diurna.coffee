
fs       = require "fs"
path     = require "path"
util     = require "util"
markdown = require "markdown"
eco      = require "eco"
stylus   = require "stylus"
stitch   = require "stitch"
_        = require "underscore"

exports.build = (from, to) ->
  scripts = path.join(from, "scripts")
  styles = path.join(from, "styles", "main.styl")

  path.exists scripts, (exists) ->
    buildScripts scripts, path.join(to, "scripts", "main.js") if exists

  path.exists styles, (exists) ->
    buildStyles styles, path.join(to, "styles", "main.css") if exists

  buildPages from, to

buildPages = (from, to) ->
  baseLayout = path.join(from, "layout.eco")

  pageLayout = (dir, file) ->
    layout = path.join(dir, "#{file}.eco")
    return layout if path.existsSync(layout)

  outFileNames = (basename) ->
    if basename is "index"
      index: "index.html"
      content: "content.html"
    #else if ".include" in basename
    #  "#{basename.replace(".include", "")}.html"
    else
      index: "#{basename}/index.html"
      content: "#{basename}/content.html"

  traverse = (baseDir, outDir) ->
    fs.readdir baseDir, (err, files) ->
      return util.error err if err

      pages = []
      dirNames = []
      includes = []
      for file in files
        if fs.statSync(path.join(baseDir, file)).isDirectory()
          dirNames.push file
        else if ".include." in file
          includes.push file
        else if path.extname(file) is ".md"
          pages.push file

      for page in pages
        basename = path.basename(page, ".md")
        buildPage
          page: path.join(baseDir, page)
          layout: baseLayout
          pageLayout: pageLayout(baseDir, basename)
          directory: outDir
          fileNames: outFileNames(basename)
          context:
            dirs: dirNames
            pages: pages

      traverse path.join(baseDir, dir), path.join(outDir, dir) for dir in dirNames

  traverse(from, to)

buildPage = (options) ->
  render = (layout, body) ->
    context = _.extend options.context,
      body: body
      read: (file) ->
        read path.join(options.directory, file)

    eco.render read(layout), context

  content = markdown.parse read(options.page)
  body = if options.pageLayout then render options.pageLayout, content else content
  html = render options.layout, body

  write path.join(options.directory, options.fileNames.content), body, (err) ->
    return util.error if err

  write path.join(options.directory, options.fileNames.index), html, (err) ->
    return util.error if err

buildScripts = (from, to) ->
  package = stitch.createPackage paths: [ from ]

  package.compile (err, source) ->
    return util.error err if err

    write to, source, (err) ->
      return util.error err if err

buildStyles = (from, to) ->
  fs.readFile from, "utf8", (err, str) ->
    return util.error err if err

    stylus(str)
      .set("filename", from)
      .include(require("nib").path)
      .render (err, css) ->
        return util.error err if err

        write to, css, (err) ->
          return util.error err if err

read = _.memoize (file) ->
  try
    fs.readFileSync file, "utf8"
  catch e
    util.error "Missing file: #{file}"

write = (file, str, next) ->
  path.exists file, (exists) ->
    if not exists
      base = ""
      for dir in path.dirname(file).split("/")
        base += "#{dir}/"
        unless path.existsSync base
          debug "Creating directory #{base}"
          fs.mkdirSync base, 0755
    
    debug "Writing file #{file}"
    fs.writeFile file, str, next

debug = ->
  util.debug.apply null, arguments if process.env.DEBUG

