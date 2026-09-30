export const isExternal = (href: string) => /^https?:\/\//i.test(href)

// Document hrefs in data files are legacy-relative paths (may contain spaces);
// they are served verbatim from /public to keep old URLs working.
// encodeURI leaves ' and & alone, which confuses crawlers once HTML-entity
// encoded — percent-encode them explicitly.
export const docUrl = (href: string) =>
  isExternal(href)
    ? href
    : '/' + encodeURI(href.replace(/^\.?\//, '')).replace(/'/g, '%27').replace(/&/g, '%26')
