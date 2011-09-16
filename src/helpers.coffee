path = require "path"

exports.nav = (root) -> (node for key, node of root.files when node.type in ["directory", "page"])

exports.include = (file) -> read path.join(options.directory, file)

exports.formatDate = require "dateformat"

exports.render = (obj, extraContext) ->
  _ = require "underscore"
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

exports.url = (path) ->
  "http://#{@hostname}/#{path if path?}"
