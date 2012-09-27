fs = require 'fs'
discount = require 'discount'

require.extensions?['.md'] = (module, filename) ->
  md = fs.readFileSync filename, 'utf8'

  module.exports = (options) ->
    if typeof options is 'number'
      discount.parse md, options
    else
      discount.parse md
