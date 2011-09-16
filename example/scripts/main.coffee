
if window.history.pushState
  $title = $("title")
  require("pjax") "nav a", "#content", (page) ->
    title = $title.text()
    pos = title.lastIndexOf "|"
    siteTitle = if pos is -1 then "| #{title}" else title.substr(pos)
    $title.text "#{page.title} #{siteTitle}"

    $anchor = $("nav a").filter (i, el) -> $(el).attr("href") is page.url

    $anchor.parent()
      .addClass("current")
      .siblings().removeClass("current")

# onload
$ ->
