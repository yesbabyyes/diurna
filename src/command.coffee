path = require "path"
fs   = require "fs"
opt  = require "getopt"
diurna = require "./diurna"

help = ->
  opt.showHelp "Usage:", (o) ->
    switch o
      when "h"
        "Show this help"
      when "o"
        ["out_dir", "Output directory (defaults to current directory)"]
      else
        "Option '#{o}'"
  return 0

opt.setopt "o:h", process.argv

if opt.params().length < 3
  return help()

from = opt.params().pop()
to = process.cwd()

opt.getopt (opt, param) ->
  switch opt
    when "h"
      return help()
    when "o"
      to = param[0]

diurna.build from, to
