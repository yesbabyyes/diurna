module.exports = (links, content, callback) ->
  pages = {}

  # Replace state immediately for back-navigation
  window.history.replaceState
    url: window.location.pathname
    title: $("title").text()
    content: $("#content").html()
  , $("title").text(), window.location.pathname

  render = (page, navigateTo) ->
    $(content).html(page.content)
    
    if navigateTo
      $("body").animate(scrollTop: 0)
      window.history.pushState(page, page.title, page.url)

    callback(page) if callback

  window.onpopstate = (e) ->
    return true unless e.state
    render(e.state, false)

  contentPath = (path) ->
    # Add trailing slash if there is none
    p = if path[path.length - 1] is "/" then path else path + "/"
    # Return path with trailing slash and content.html
    p + "content.html"

  $body = $("body")
  $(links).live "click", (e) ->
    # Only pay attention to left clicks without meta key
    return true if e.which > 1 or e.metaKey
    $anchor = $(e.currentTarget)
    path = $anchor.attr("href")
    # We can't do this for external links
    return true if /^([a-z]+):/.test(path)
    mtime = $anchor.data("mtime")
    key = path + mtime
    if key of pages
      render(pages[key], true)
    else
      xhr.abort() if xhr
      xhr = $.get contentPath(path), {mtime}, (response, status, xhr) ->
        if status in ["success", "notmodified"]
          page =
            url: path
            title: $anchor.attr("title")
            content: response
          
          pages[key] = page
          render(page, true)

        xhr = null

    e.preventDefault()

  $("body").ajaxStart -> $(this).addClass("progress")
  $("body").ajaxStop -> $(this).removeClass("progress")
