exports.nav = (root) -> (node for key, node of root.files when node.type in ["directory", "page"])

exports.include = (file) -> read path.join(options.directory, file)

exports.formatDate = formatDate = require "dateformat"

exports.humanDate = (date) ->
  day = 24 * 60 * 60 * 1000
  diff = new Date() - date
  format = if diff < day then "HH:MM" else "yyyy-mm-dd HH:MM"
  formatDate date, format
