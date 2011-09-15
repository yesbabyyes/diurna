module.exports = (links, content, callback) ->
  pages = {}

  render = (page, navigateTo) ->
    $(content).html(page.content)
    $("title").text(page.title)
    
    if navigateTo
      $("body").animate(scrollTop: 0)
      window.history.pushState(page, page.title, page.url)

  window.onpopstate = (e) ->
    return false unless e.state
    render(e.state, false)

  contentPath = (path) ->
    # Add trailing slash if there is none
    p = if path[path.length - 1] is "/" then path else path + "/"
    # Return path with trailing slash and content.html
    p + "content.html"

  $body = $("body")
  $(links).live "click", (e) ->
    $anchor = $(e.currentTarget)
    path = $anchor.attr("href")
    # We can't do this for external links
    return if /^([a-z]+):/.test(path)
    mtime = $anchor.data("mtime")
    key = path + mtime
    if key of pages
      render(pages[key], true)
      callback($anchor, pages[key]) if callback
    else
      $body.addClass("progress")
      $.get contentPath(path), {mtime}, (response, status, xhr) ->
        $body.removeClass("progress")
        if status in ["success", "notmodified"]
          page =
            url: path
            title: $anchor.attr("title")
            content: response
          
          pages[key] = page
          render(page, true)
          callback($anchor, page) if callback

    e.preventDefault()
