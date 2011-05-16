pages = {}

render = (page, push) ->
  $("#content").html page.content
  $("title").text page.title

  window.history.pushState page, page.title, page.url if push

window.history.onpopstate = (e) ->
  render e.state, false

$("a.page").live "click", (e) ->
  $anchor = $ @
  checksum = $anchor.data("checksum")
  if checksum of pages
    render pages[checksum], true
  else
    url = $anchor.attr("href").replace("index.html", "content.html")
    $.get url, {checksum: checksum}, (response, status, xhr) ->
      if status in ["success", "notmodified"]
        page =
          url: url
          title: $anchor.attr("title")
          content: response

        pages[checksum] = page
        render page, true

  e.preventDefault()

# onload
$ ->
