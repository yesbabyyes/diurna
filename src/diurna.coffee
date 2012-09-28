exports.version = "0.1.1"

fs         = require "fs"
path       = require "path"
util       = require "util"
markdown   = require "discount"
eco        = require "eco"
stylus     = require "stylus"
stitch     = require "stitch"
_          = require "underscore"
async      = require "async"
helpers    = require "./helpers"

_verbosity = 0

RESERVED_NAMES = [
  "images"
  "scripts"
  "styles"
  "plugins"
]

exports.skeleton = path.resolve(__dirname, "..", "example")

exports.build = (from, to, verbosity, watch) ->
  _verbosity = verbosity if verbosity
  configFile = path.join(from, "config.json")
  config = {}
  if fs.existsSync(configFile)
    config = JSON.parse fs.readFileSync configFile, "utf8"

  paths =
    scripts: path.join(from, "scripts")
    styles: path.join(from, "styles", "main.styl")
    images: path.join(from, "images")
    plugins: path.join(from, "plugins")

  if fs.existsSync paths.scripts
    scriptBuilder = ->
      buildScripts paths.scripts, path.join(to, "scripts", "app.js")

    scriptBuilder()

    watchPath paths.scripts, scriptBuilder if watch

  if fs.existsSync paths.styles
    stylesBuilder = ->
      buildStyles from, paths.styles, path.join(to, "styles", "main.css")

    stylesBuilder()

    watchPath paths.styles, stylesBuilder if watch

  if fs.existsSync paths.images
    imageDest = path.join(to, "images")

    mkdirs imageDest
    for file in fs.readdirSync paths.images
      do (file) ->
        link path.join(paths.images, file), path.join(imageDest, file)

  if fs.existsSync paths.plugins
    plugins = require paths.plugins
    if 'async' of plugins
      asyncPlugins = plugins.async
      delete plugins.async

    _.extend config, plugins

  if asyncPlugins
    async.parallel asyncPlugins(config), (err, results) ->
      if err
        console.error "Error running async plugins", err
        process.exit 1
      else
        _.extend config, results
        buildPages config, from, to, watch

  else
    buildPages config, from, to, watch

watchPath = (path, callback) ->
  log "Watching #{path} for changes"
  fs.watchFile path, (curr, prev) ->
    if curr.mtime > prev.mtime
      log "#{path} has changed, rebuilding"
      callback()

buildPages = (config, from, to, watch) ->
  # Parse the title from a filename, meaning strip any leading numbers,
  # if followed by period or dash.
  # Also creates a slug, or parses a custom slug if specified.
  #
  # > parseTitle("1. My cool blog post")
  # [my-cool-blog-post, My cool blog post]
  # > parseTitle("1 My cool blog post")
  # [1-my-cool-blog-post, 1 My cool blog post]
  # > parseTitle("2. @(custom-slug) Really cool")
  # [custom-slug, Really cool]
  parseTitle = (filename) ->
    re = /^(?:\d+\s*(?:\.|-)\s*)?(?:@\((.*)\)\s+)?(.*)/
    [slug, title] = filename.match(re)[1..]
    [slug or helpers.slugify(title), title]

  filenames = (node) ->
    if node.type is "xml" then "#{node.name}.#{node.type}"
    else
      if node.name is "index"
        index: "index.html"
        content: "content.html"
      #else if ".include" in basename
      #  "#{basename.replace(".include", "")}.html"
      else
        index: "#{node.name}/index.html"
        content: "#{node.name}/content.html"

  createNode = (parent, file) ->
    node = parent.files[file] = {}
    node.parent = parent
    node.file = file
    extension = path.extname(file)
    node.extension = extension.toLowerCase()
    node.filePath = path.join parent.filePath, file
    [node.name, node.title] = parseTitle path.basename(file, extension)
    name = if node.name is "index" then "" else node.name
    node.path = path.join parent.path, name
    node.path = "" if node.path is "."
    node

  processPage = (filePath, node, options, currentDir) ->
    parent = node.parent
    templates = if parent.templates then [].concat parent.templates else []
    pageTemplate = path.join(currentDir, "#{node.name}.eco")
    if fs.existsSync pageTemplate
      templates.push pageTemplate
      node.template = pageTemplate
    context = {}
    _.extend context, node
    _.extend context,
      basePath: from
      outPath: to
      root: options.root
    _.extend context, config

    buildPage
      body: node.body
      directory: path.join(options.outDir, parent.path)
      layout: options.layout
      templates: templates
      filename: filenames(node)
      context: context

  traverse = (options, parent) ->
    options.root ?= parent
    options.layout ?= path.join(options.baseDir, "layout.eco")
    currentDir = path.join(options.baseDir, parent.filePath)

    fs.readdir currentDir, (err, files) ->
      return util.error err if err

      pages = {}
      dirNames = []

      for file in files.sort() when file not in RESERVED_NAMES
        if file[0] is "." or file[file.length - 1] is "~"
          log "Skipping #{file}"
          continue

        filePath = path.join(currentDir, file)
        log "Processing #{filePath}"

        if watch
          watchPath filePath, ->
            buildPages config, from, to

        node = createNode(parent, file)
        stat = fs.statSync(filePath)
        node.ctime = stat.ctime
        node.mtime = stat.mtime

        if stat.isDirectory()
          node.type = "directory"
          node.files = {}
          dirNames.push node
        else if file is "template.eco"
          parent.templates ?= []
          parent.templates.push filePath
        else if file.match /\.include\./
          node.type = "include"
          parent.includes ?= []
          parent.includes.push file
        else if node.extension is ".md"
          node.type = if file is "index.md" then "index" else "page"
          # FIXME: Fix killAllOrphans node.body = markdown.parse helpers.killAllOrphans read(filePath)
          node.body = markdown.parse read(filePath)
          pages[filePath] = node
        else if node.extension is ".html"
          node.type = if file is "index.html" then "index" else "page"
          node.body = read(filePath)
          pages[filePath] = node
        else if node.extension is ".xml"
          node.type = "xml"
          node.body = read(filePath)
          pages[filePath] = node
        else if node.extension.toLowerCase() in [".jpg", ".png", ".gif", ".jpeg"]
          node.type = "image"
          pages[filePath] = node
          link filePath, path.join(options.outDir, parent.path, node.name + node.extension)
        else if node.extension is ".eco"
          node.type = "template"
        else
          link filePath, path.join(options.outDir, parent.path, file)

      processPage(page, node, options, currentDir) for page, node of pages

      for node in dirNames
        node.templates = parent.templates
        traverse options, node

  root =
    name: "__root__"
    path: ""
    files: {}

  traverse
    baseDir: from
    outDir: to
  , root

buildPage = (options) ->
  render = (templates, body) ->
    return body unless templates.length

    context = {}
    _.extend context, options.context
    _.extend context, helpers
    context.dirs = helpers.nav(context.root)
    context.siblings = helpers.nav(context.parent)
    context.directory = options.directory
    context.body = body if body?

    [remainingTemplates..., template] = templates
    render remainingTemplates, require(template)(context)

  body = render options.templates, options.body

  if fs.existsSync options.layout
    html = render [options.layout], body
  else
    html = body

  if options.filename instanceof Object
    write path.join(options.directory, options.filename.content), body, (err) ->
      return util.error(err) if err

      write path.join(options.directory, options.filename.index), html, (err) ->
        return util.error(err) if err
  else
    write path.join(options.directory, options.filename), body, (err) ->
      return util.error(err) if err

link = (src, dst) ->
  if not fs.existsSync dst
    mkdirs path.dirname(dst)

  try
    fs.linkSync src, dst
    log "Linked from #{src} to #{dst}"
  catch e
    console.error "Couldn't link #{src} to #{dst}:", e.message

buildScripts = (from, to) ->
  pkg = stitch.createPackage
    paths: [ from ]
    compress: process.env.NODE_ENV is "production"

  pkg.compile (err, source) ->
    return util.error err if err

    write to, source, (err) ->
      return util.error err if err

buildStyles = (base, from, to) ->
  fs.readFile from, "utf8", (err, str) ->
    return util.error err if err

    stylus(str)
      .set("filename", from)
      .set("compress", process.env.NODE_ENV is "production")
      .define("url", stylus.url(paths: [base]))
      .use(require("nib")())
      .import("nib")
      .render (err, css) ->
        return util.error err if err

        write to, css, (err) ->
          return util.error err if err

read = (file) ->
  try
    fs.readFileSync file, "utf8"
  catch e
    util.error "Missing file: #{file}"

write = (file, str, next) ->
  if str
    fs.exists file, (exists) ->
      mkdirs path.dirname(file) unless exists

      log "Writing file #{file}"
      fs.writeFile file, str.trim(), next

mkdirs = (pathName) ->
  base = ""
  for dir in pathName.split("/")
    base += "#{dir}/"

    unless fs.existsSync base
      log "Creating directory #{base}"
      fs.mkdirSync base, 0o755

log = ->
  console.log.apply null, arguments if _verbosity
