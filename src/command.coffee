usage = '''Usage: $0 [OPTION]...
Build a website from templates.
Example: $0 -o html/ files/'''

options =
  h:
    alias: "help"
    description: "Show help"
  o:
    alias: "out"
    description: "Output directory"
    default: "html"
  v:
    alias: "verbose"
    description: "Verbose output"
  i:
    alias: "import"
    description: "Blog platform to import from (posterous)"

path = require "path"
fs   = require "fs"
argv = require("optimist")
        .usage(usage)
        .options(options)
        .check((argv)->
          throw "I'm not friends with #{argv.i} yet. Set up a date?" if argv.i and argv.i isnt "posterous")
        .argv
diurna = require "./diurna"
importer = require "./import"

cwd = process.cwd()

verbosity = if argv.v then argv.v.length else 0

if argv.i
  importer(argv.i, argv._)
else if argv._.length
  diurna.build path.resolve(cwd, argv._[0]), path.resolve(cwd, argv.o), verbosity
