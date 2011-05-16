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
        fs.mkdirSync base, 0755 unless path.existsSync base
    
    fs.writeFile file, str, next

buildPages = (from, to) ->
  debug "build pages" + from
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

main process.argv
