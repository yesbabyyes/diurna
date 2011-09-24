fs      = require "fs"
path    = require "path"
url     = require "url"
request = require "request"
_       = require "underscore"

exports.nav = (root) -> (node for key, node of root.files when node.type in ["directory", "page"])

exports.include = (file) -> read path.join(options.directory, file)

exports.formatDate = require "dateformat"

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

exports.thumbnail = _.memoize (file, width, height) ->
  height ?= width

  thumbnailName = (file) =>
    base = path.join @parent.filePath,
      path.dirname(file),
      path.basename(file, path.extname(file))
    "#{base}_#{width}_#{height}.png"

  if /^(http(s)?|ftp):\/\//i.test(file)
    thumbnail = thumbnailName url.parse(file).pathname[1..].replace(/\//g, "_")
    read = (next) ->
      request.get uri: file, encoding: "binary", (err, response, body) ->
        if err or not (200 <= response.statusCode < 400)
          console.error(err, response.statusCode)
        else
          next(new Buffer(body, "binary"))
  else
    thumbnail = thumbnailName(file)
    read = (next) ->
      fs.readFile file, (err, data) ->
        return console.error(err) if err
        next(data)

  convert = (data) =>
    Canvas = require "canvas"
    img = new Canvas.Image()
    img.src = data
    ratio = Math.min width / img.width, height / img.height
    scaledWidth = ratio * img.width
    scaledHeight = ratio * img.height
    canvas = new Canvas(scaledWidth, scaledHeight)
    ctx = canvas.getContext("2d")
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

    out = fs.createWriteStream path.join(@directory, thumbnail)
    stream = canvas.createPNGStream()

    stream.on "data", (chunk) -> out.write(chunk)

  read convert
  thumbnail
