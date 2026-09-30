# DPSE Goa — Static Nuxt Website (GIGW Template 2.0 design)

Redeveloped website of the **Directorate of Planning, Statistics & Evaluation (DPSE), Government of Goa**
(dpse.goa.gov.in), built as a fully static site with [Nuxt 3](https://nuxt.com) and styled with the
**[GIGW Template 2.0](https://github.com/LetsApp/Gigw-template-2.0)** design system (classic GIGW theme:
Government-of-India top utility bar, masthead with emblems, accessibility panel, font-size controls,
dark mode, Bhashini translate, client-side search, and GIGW-compliant footer).

## Commands

```bash
npm install        # install dependencies
npm run dev        # local development server (http://localhost:3000)
npm run generate   # build the static site into .output/public/
npm run preview    # preview the generated static site
```

Deploy by copying the contents of `.output/public/` to the web server's document root.
No server-side runtime (Node, PHP, database) is required — the site is 100% static.
(The GIGW visitor counter and "last updated" degrade gracefully on static hosting,
seeded from `public/data/site-stats.json` and `public/resources/data/site-stats.json`.)

## Structure

- `pages/` — one Vue file per site page, using the GIGW template's component classes
  (`.data-table`, `.dl-btn`, `.feature-grid`, `.contact-lines`, `.breadcrumb`, …).
- `layouts/default.vue` — carries the GIGW chrome placeholders; the header (top utility bar +
  masthead + navigation) and footer are injected by the template's `includes.js` from JSON.
- `public/resources/assets/` — the GIGW Template 2.0 shared assets (CSS, JS, fonts,
  FontAwesome subset, media), copied verbatim from the template repo. `head.js` is patched
  to use the Government of Goa emblem as the favicon.
- `public/resources/data/gigw/{header,nav,footer}.json` — **the site chrome content**: brand, menu and
  footer. Edit these to change the header/nav/footer on every page.
- `public/resources/data/routes.json` — page list used by the template's client-side search (`/search/`).
- `data/*.json` — **content lists** (publications, notices, RTI, tenders, Aadhaar documents, etc.),
  extracted from the legacy FrontPage site by `scripts/extract.mjs`.
- `public/` — all published PDFs and images, **kept at their original URL paths** (including
  `pub/`, `publications/`, `tenders/`, `gspb/` folders and root-level PDFs with spaces in their
  names) so that existing links and search-engine results keep working.

## Updating content

1. **New notice on the homepage** — add an entry at the top of `data/notices.json` and drop the
   PDF into `public/`.
2. **New publication** — drop the PDF into `public/` and add `{ "title": "...", "href": "..." }`
   to `data/publications.json`. The Publications page groups titles into series automatically.
3. **Menu / footer change** — edit `public/resources/data/gigw/nav.json` or `footer.json`.
4. Re-run `npm run generate` and redeploy `.output/public/`.

## Legacy URL redirects

`nuxt.config.ts` contains a `routeRules` map of every old `.htm` URL to its new route, and the
build also emits meta-refresh redirect pages for them. Mirror them as **301 redirects in the web
server** for proper SEO. For nginx:

```nginx
location = /welcome.htm        { return 301 /; }
location = /aboutus.htm        { return 301 /about; }
location = /activities.htm     { return 301 /activities; }
location = /off-crbd.htm       { return 301 /births-and-deaths; }
location = /censuses.htm       { return 301 /censuses; }
location = /publications.htm   { return 301 /publications; }
location = /publicationsnew.htm { return 301 /publications; }
location = /staff.htm          { return 301 /organisational-setup; }
location = /rti.htm            { return 301 /rti; }
location = /Aadhaar.htm        { return 301 /aadhaar; }
location = /contactus.htm      { return 301 /contact; }
location = /tenders.htm        { return 301 /tenders; }
location = /gspb.htm           { return 301 /citizen-charter; }
location = /otherwebsites.htm  { return 301 /related-links; }
location = /photogallary.htm   { return 301 /gallery; }
location = /csr-authority.htm  { return 301 /csr; }
location = /csr-about-us.htm   { return 301 /csr/about; }
location = /csr-projects.htm   { return 301 /csr/projects; }
location = /csr-gallery.htm    { return 301 /csr/gallery; }
location = /csr-contact-us.htm { return 301 /csr/contact; }
```

PDF URLs are unchanged from the old site, so no redirects are needed for documents.

## Large files NOT in this repository

Two PDFs exceed GitHub's 100 MB per-file limit and are excluded from git (see `.gitignore`);
copy them into `public/` manually (from the old webroot) before building for production:

- `public/Economic Survey 2018-19.pdf` (~159 MB)
- `public/Economic Survey 2022-23.pdf` (~189 MB)

Alternatively, enable Git LFS on the repository and track them there.

## Migration notes

- The legacy site had **no database or server-side code**; all content was static HTML + PDFs.
- The old tenders page's entries were all commented out (2011–2018); they are preserved under
  "Archived tender & auction notices" on the Tenders page.
- Case-mismatched PDF filenames (`.PDF` vs `.pdf`) from the old Windows/IIS server were normalised
  during migration so links work on case-sensitive Linux servers.
- The Statistics Day 2009 photo microsite is preserved as a static archive at
  `/DPSE-Statistics-Day-2009/index.html`.
- The SSL certificate **private key** was not present in the old webroot (only the `.crt`/`.pem`
  certificates) — retrieve it from the old server or re-key the certificate for the new server.
