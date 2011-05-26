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
      when "v"
        "Verbose"
      else
        "Option '#{o}'"
  return 0

opt.setopt "o:hv", process.argv

if opt.params().length < 3
  return help()

to = cwd = process.cwd()
from = path.join(cwd, opt.params().pop())
verbosity = 0

opt.getopt (opt, param) ->
  switch opt
    when "h"
      return help()
    when "o"
      to = param[0]
    when "v"
      verbosity = param

diurna.build from, to, verbosity
