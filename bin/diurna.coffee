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
  fs.mkdir path.dirname(file), 0755, (err) ->
    return next(err) if err
    fs.writeFile file, str, (err) ->
      next(err)

buildPages = (from, to) ->
  resolveLayout = (base, dir) ->
    customLayout = path.join(dir, "layout.eco")
    return customLayout if path.existsSync(customLayout)
    path.join(base, "layout.eco")

  traverse = (dir, outDir) ->
    fs.readdir dir, (err, files) ->
      return util.error err if err

      for file in files
        inFile = path.join(dir, file)
        stats = fs.statSync inFile

        if stats.isDirectory()
          traverse inFile, path.join(outDir, file)
        else if path.extname(inFile) is ".md"
          outFile = path.join outDir, path.basename(file, ".md") + ".html"
          buildPage resolveLayout(from, dir), inFile, outFile

  traverse(from, to)

buildPage = (layout, from, to) ->
  debug "Compiling #{from} to #{to} using layout #{layout}"
  body = markdown.parse read(from)
  html = eco.render read(layout), body: body
  write to, html, (err) ->
    return util.error if err
    debug "Compiled #{from} to #{to} using layout #{layout}"

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

opt.setopt "i:o:", process.argv

inDir = outDir = opt.params().pop()

opt.getopt (opt, param) ->
  switch opt
    when "o"
      outDir = param[0]

build inDir, outDir

