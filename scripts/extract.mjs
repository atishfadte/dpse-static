// One-time content extraction from the legacy FrontPage site (var/sites/DPSE)
// Produces JSON data files consumed by the Nuxt pages.
import { load } from 'cheerio'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OLD = '/Users/dpg/Desktop/Dattatray/DPSE'
const OUT = join(import.meta.dirname, '..', 'data')
mkdirSync(OUT, { recursive: true })

const NAV_HREFS = new Set([
  'welcome.htm', 'aboutus.htm', 'activities.htm', 'off-crbd.htm', 'censuses.htm',
  'publications.htm', 'staff.htm', 'rti.htm', 'Aadhaar.htm', 'contactus.htm',
  'csr-authority.htm', 'csr-about-us.htm', 'csr-projects.htm', 'csr-gallery.htm',
  'csr-contact-us.htm', 'otherwebsites.htm', 'photogallary.htm', 'gspb.htm',
  'tenders.htm', 'publicationsnew.htm', 'exam.html', 'inaguration.htm',
])

const clean = (s) => (s || '')
  .replace(/ /g, ' ')
  .replace(/â€œ|â€|â€/g, '"').replace(/â€™|â€˜/g, "'").replace(/â€“|â€”/g, '-')
  .replace(/Ã¢â‚¬Å“|Ã¢â‚¬|Ã¢â‚¬/g, '"').replace(/Ã‚/g, ' ')
  .replace(/\s+/g, ' ').trim()

const isDocHref = (h) => h && !NAV_HREFS.has(h) && !/^javascript:|^#|^mailto:/i.test(h) &&
  !/\.(gif)$/i.test(h) && h.trim() !== '' && h.trim() !== '.pdf'

function page (name, { revealComments = false } = {}) {
  let html = readFileSync(join(OLD, name), 'latin1')
  if (revealComments) html = html.replace(/<!--/g, '').replace(/-->/g, '')
  return load(html)
}

const stripIndex = (s) => s.replace(/^\d+\s+/, '').replace(/^[-.\s]+|[-.\s]+$/g, '').trim()
const yearFromHref = (h) => {
  const m = h.match(/(19|20)\d{2}\s*[-–to ]*\s*(\d{2,4})?/)
  return m ? m[0].replace(/\s+/g, ' ').trim() : ''
}

// --- Publications tables: one <tr> per series, each year is its own anchor ---
function extractSeriesTable (name) {
  const $ = page(name)
  const items = []
  const isYearish = (t) => /^[\s\S]{0,4}(19|20)\d{2}/.test(t) && t.length <= 12
  $('tr').each((_, tr) => {
    const $tr = $(tr)
    if ($tr.find('table').length) return // only innermost rows
    const links = $tr.find('a[href]').toArray()
      .map(a => ({ href: ($(a).attr('href') || '').trim(), text: clean($(a).text()) }))
      .filter(l => isDocHref(l.href))
    if (!links.length) return

    let rowTitle = clean($tr.text())
    for (const l of links) if (l.text) rowTitle = rowTitle.replace(l.text, '')
    rowTitle = clean(rowTitle.replace(/Click\s*here/gi, '').replace(/\bnew\b\s*$/i, ''))
    rowTitle = rowTitle.replace(/^\d+\s+(?=\S)/, '').replace(/^[-.\s:]+|[-.\s:]+$/g, '')

    const seriesRow = links.length > 1 || links.some(l => isYearish(l.text))
    let series = rowTitle
    if (seriesRow) {
      // years belong to items, not to the series name
      series = clean(series.replace(/\b(19|20)\d{2}([-/]\d{2,4})?\b/g, ''))
        .replace(/^[-.\s:]+|[-.\s:]+$/g, '')
    }

    for (const l of links) {
      let title
      const linkLabel = l.text.replace(/Click\s*here/gi, '').trim()
      if (seriesRow && series) title = linkLabel ? `${series} ${linkLabel}` : `${series} ${yearFromHref(l.href)}`
      else title = rowTitle || linkLabel || stripIndex(l.href.replace(/\.pdf$/i, ''))
      title = clean(title)
      if (title && title.toLowerCase() !== 'click here') items.push({ title, href: l.href })
    }
  })
  return items
}

// --- Link-list pages: each anchor is its own item ---
function extractLinks (name, opts = {}) {
  const $ = page(name, opts)
  const items = []
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href')
    const text = clean($(a).text()).replace(/Click\s*here/gi, '').trim()
    if (!isDocHref(href)) return
    const title = text || stripIndex(decodeURIComponent(href).replace(/\.pdf$/i, '').replace(/.*\//, ''))
    if (title) items.push({ title, href })
  })
  return items
}

// --- Rows where the anchor text is "Click here" and title sits in sibling cell ---
function extractRowTitledLinks (name, opts = {}) {
  const $ = page(name, opts)
  const items = []
  $('tr').each((_, tr) => {
    const $tr = $(tr)
    if ($tr.find('table').length) return
    const links = $tr.find('a[href]').toArray()
      .map(a => ({ href: $(a).attr('href'), text: clean($(a).text()) }))
      .filter(l => isDocHref(l.href))
    if (!links.length) return
    let title = clean($tr.text())
    for (const l of links) if (l.text) title = title.replace(l.text, '')
    title = clean(title.replace(/Click\s*here/gi, '').replace(/\bnew\b\s*$/i, ''))
    title = title.replace(/^\d+\s*$/, '').replace(/^\d+\s+(?=\S)/, '')
    for (const l of links) {
      const best = (title.length >= (l.text || '').length ? title : l.text) || l.text
      if (best) items.push({ title: best, href: l.href })
    }
  })
  return items
}

function dedupe (items) {
  const seen = new Set()
  return items.filter(i => {
    const k = i.title + '|' + i.href
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const out = {}
out['publications'] = dedupe(extractSeriesTable('publications.htm'))
out['publications-archive'] = dedupe(extractSeriesTable('publicationsnew.htm'))
out['tenders-archive'] = dedupe(extractRowTitledLinks('tenders.htm', { revealComments: true }))
out['rti'] = dedupe(extractLinks('rti.htm'))
out['citizen-charter'] = dedupe(extractLinks('gspb.htm'))
out['aadhaar'] = dedupe(extractLinks('Aadhaar.htm'))
out['births-deaths-docs'] = dedupe(extractRowTitledLinks('off-crbd.htm'))
out['notices'] = dedupe(extractLinks('welcome.htm'))

// external related websites
{
  const $ = page('otherwebsites.htm')
  const items = []
  $('a[href^="http"]').each((_, a) => {
    const href = $(a).attr('href')
    const text = clean($(a).text())
    if (text) items.push({ title: text, href })
  })
  out['related-websites'] = dedupe(items)
}

// CSR gallery images
{
  const $ = page('csr-gallery.htm')
  const items = []
  $('img[src]').each((_, img) => {
    const src = $(img).attr('src')
    if (/newblinka|\.gif$|dpse-goa-hd2/i.test(src)) return
    items.push({ src, alt: clean($(img).attr('alt') || '') })
  })
  out['csr-gallery'] = items
}

for (const [k, v] of Object.entries(out)) {
  writeFileSync(join(OUT, k + '.json'), JSON.stringify(v, null, 2))
  console.log(k.padEnd(24), v.length)
}
