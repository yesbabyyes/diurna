usage = '''Usage: $0 [OPTION]...
Build a website from templates.
Example: $0 -o html/ files/'''

options =
  h:
    alias: "help"
    description: "Show help"
    boolean: true
  o:
    alias: "out"
    description: "Output directory"
    default: "html"
  v:
    alias: "verbose"
    description: "Verbose output"
    boolean: true
  i:
    alias: "import"
    description: "Blog platform to import from (posterous)"
  w:
    alias: "watch"
    description: "Rebuild if any file is changed"

optimist = require("optimist")
        .usage(usage)
        .options(options)
        .check((argv)->
          throw "I'm not friends with #{argv.i} yet. Set up a date?" if argv.i and argv.i isnt "posterous")

cwd = process.cwd()
argv = optimist.argv

if argv.h
  optimist.showHelp()
else if argv.i
  require("./import")(argv.i, argv._)
else if argv._.length
  diurna = require "./diurna"
  path = require "path"

  diurna.build path.resolve(cwd, argv._[0]), path.resolve(cwd, argv.o), argv.v, argv.w
