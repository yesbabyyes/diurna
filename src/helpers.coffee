fs      = require "fs"
path    = require "path"
util    = require "util"
url     = require "url"
request = require "request"
crypto  = require "crypto"
_       = require "underscore"
# register markdown require extension
require './requireMarkdown'

exports.nav = (root) ->
 nodes = (node for key, node of root.files when node.type in ["directory", "page", "image", "index"])
 nodes.sort (a, b) ->
   if a.file is b.file then 0
   else if a.type is 'index' then -1
   else if b.type is 'index' then 1
   else if a.file < b.file then -1
   else 1

exports.include = (file) ->
  try
    require(path.join @basePath, path.dirname(@filePath), file) @
  catch e
    console.error file, e
    ""

exports.formatDate = require "dateformat"

orphanKiller = /(\w.*)[ \t]+(\S+)$/gm
exports.killAllOrphans = (s) ->
  s.replace(orphanKiller, "$1&nbsp;$2")

exports.render = (obj, extraContext) ->
  context = {}
  _.extend(context, @)
  _.extend(context, obj)
  _.extend(context, extraContext) if extraContext
  require(@parent.templates[0])(context)

exports.sort = (items, field, reverse) ->
  value = if reverse then -1 else 1
  [].concat(items).sort (a, b) ->
    if a[field] > b[field] then value
    else if a[field] < b[field] then -value
    else 0

exports.url = _.memoize (path) ->
  "http://#{@hostname}/#{path or ""}"

thumbnail = (file, width, height) ->
  height ?= width

  getName = (file) ->
    base = path.join path.dirname(file), path.basename(file, path.extname(file))
    "#{base}_#{width}_#{height}.png"

  if /^(http(s)?|ftp):\/\//i.test(file)
    thumbnailName = getName url.parse(file).pathname[1..].replace(/\//g, "_")
    read = (next) ->
      request.get uri: file, encoding: "binary", (err, response, body) ->
        if err or not (200 <= response.statusCode < 400)
          console.error(err, response.statusCode)
        else
          next(new Buffer(body, "binary"))
  else
    thumbnailName = getName(file)
    read = (next) =>
      fs.readFile path.join(@directory, path.basename(file)), (err, data) ->
        return console.error("THUMB", err) if err
        next(data)

  thumbnailPath = path.join(@directory, thumbnailName)

  convert = (data) ->
    Canvas = require "canvas"
    img = new Canvas.Image()
    img.src = data
    ratio = Math.min width / img.width, height / img.height
    scaledWidth = Math.round ratio * img.width
    scaledHeight = Math.round ratio * img.height
    canvas = new Canvas(scaledWidth, scaledHeight)
    ctx = canvas.getContext("2d")
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

    out = fs.createWriteStream thumbnailPath
    stream = canvas.createPNGStream()

    stream.on "data", (chunk) -> out.write chunk

  path.exists thumbnailPath, (exists) ->
    read convert unless exists

  thumbnailName

exports.thumbnail = _.memoize thumbnail, (args...) ->
  args.join "::"

checksumCalculator = (base) ->
  cache = {}

  (file) ->
    unless file in cache
      contents = fs.readFileSync path.join(base, file[1..])
      cache[file] = crypto.createHash("md5")
        .update(contents)
        .digest("base64")
        .replace(/\=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

    cache[file]

exports.checksum = (file) ->
  calculate = checksumCalculator @outPath
  try
    checksum = calculate file
    file + "?" + checksum
  catch e
    file

slugify = (str) ->
  slug = str.toLowerCase()

  for replacement, regex of slugify.replaces
    slug = slug.replace(regex, replacement)

  slug.replace(/[^\w-\.]/g, '').replace(/-+/g, '-')

slugify.replaces =
  'a': /[åäàáâ]/g
  'c': /ç/g
  'e': /[éèëê]/g
  'i': /[ìíïî]/g
  'u': /[üû]/g
  'o': /[öô]/g
  '-': new RegExp ' ', 'g'

exports.slugify = slugify
