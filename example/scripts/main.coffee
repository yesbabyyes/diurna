if window.history.pushState
  $title = $("title")
  updateTitle = (page) ->
    title = $title.text()
    pos = title.lastIndexOf "|"
    siteTitle = if pos is -1 then title else title.substr(pos + 2)

    if page.title
      $title.text("#{page.title} | #{siteTitle}")
    else
      $title.text(siteTitle)

  updateCurrent = (page) ->
    $anchor = $("nav a").filter (i, el) -> $(el).attr("href") is page.url

    $anchor.parent()
      .addClass("current")
      .siblings().removeClass("current")

  require("pjax") "#main-header a, nav a", "#content", (page) ->
    updateTitle(page)
    updateCurrent(page)

# onload
$ ->
