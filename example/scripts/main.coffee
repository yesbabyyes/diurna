if window.history.pushState
  require("pjax")("nav a:not[href^=http]", "#content")

# onload
$ ->
