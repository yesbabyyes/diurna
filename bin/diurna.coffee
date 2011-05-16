#!/usr/bin/env coffee

fs       = require "fs"
path     = require "path"
util     = require "util"
opt      = require "getopt"
markdown = require "markdown"
eco      = require "eco"
stylus   = require "stylus"
stitch   = require "stitch"
_        = require "underscore"

main = (args) ->
  help = ->
    opt.showHelp "diurna", (o) ->
      switch o
        when "h"
          "Show this help"
        when "o"
          ["out_dir", "Output directory (defaults to current directory)"]
        else
          "Option '#{o}'"
    return 0
  
  opt.setopt "o:h", args
  
  if opt.params().length < 3
    return help()
  
  inDir = opt.params().pop()
  outDir = process.cwd()
  
  opt.getopt (opt, param) ->
    switch opt
      when "h"
        return help()
      when "o"
        outDir = param[0]
  
  build inDir, outDir
  
debug = ->
  util.debug.apply null, arguments if process.env.DEBUG

build = (from, to) ->
  scriptsDir = path.join(from, "scripts")
  stylesDir = path.join(from, "styles")

  path.exists scriptsDir, (exists) ->
    buildScripts scriptsDir, path.join(to, "scripts", "main.js") if exists

  path.exists stylesDir, (exists) ->
    buildStyles stylesDir, path.join(to, "styles", "main.css") if exists

  buildPages from, to

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

      fileNames = []
      dirNames = []
      for file in files
        if fs.statSync(path.join(baseDir, file)).isDirectory()
          dirNames.push file
        else
          fileNames.push file

      for file in fileNames
        if path.extname(file) is ".md"
          basename = path.basename(file, ".md")
          buildPage
            page: path.join(baseDir, file)
            layout: baseLayout
            pageLayout: pageLayout(baseDir, basename)
            directory: outDir
            fileNames: outFileNames(basename)

      traverse path.join(baseDir, dir), path.join(outDir, dir) for dir in dirNames

  traverse(from, to)

buildPage = (options) ->
  render = (layout, body) ->
    eco.render read(layout), body: body

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
      debug "Compiled scripts to #{to}"

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
          debug "Compiled styles to #{to}"

main process.argv
