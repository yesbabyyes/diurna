if window.history.pushState
  require("pjax") "nav a", "#content", ($anchor, page) ->
    $anchor.parent()
      .addClass("current")
      .siblings().removeClass("current")

# onload
$ ->
