export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  ssr: true,

  app: {
    head: {
      // data-base="" -> the GIGW template scripts read site data from /data/…
      htmlAttrs: { lang: 'en', 'data-base': '' },
      title: 'Directorate of Planning, Statistics & Evaluation, Government of Goa',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Directorate of Planning, Statistics & Evaluation (DPSE), Government of Goa — statistical publications, censuses, registration of births & deaths, Aadhaar services and Goa CSR Authority.',
        },
        { name: 'keywords', content: 'DPSE, Goa, Planning, Statistics, Evaluation, Government of Goa, Censuses, Publications' },
        { name: 'author', content: 'Directorate of Planning, Statistics & Evaluation, Government of Goa' },
      ],
      // GIGW template runtime (from Gigw-template-2.0): boot.js + head.js are
      // render-blocking in <head> by design (no-flash dark mode / fonts / icons);
      // includes.js injects the header, nav and footer at the end of <body>.
      script: [
        { src: '/resources/assets/js/boot.js' },
        { src: '/resources/assets/js/head.js' },
        { src: '/resources/assets/js/includes.js', tagPosition: 'bodyClose' },
      ],
      link: [{ rel: 'stylesheet', href: '/resources/assets/css/style.css' }],
    },
  },

  css: ['~/assets/css/site.css'],

  nitro: {
    prerender: { crawlLinks: true, routes: ['/', '/search'] },
  },

  // Legacy .htm URLs → new routes (also mirror these as 301s in the web
  // server config, since static hosting may not serve these redirects).
  routeRules: {
    '/welcome.htm': { redirect: { to: '/', statusCode: 301 } },
    '/aboutus.htm': { redirect: { to: '/about', statusCode: 301 } },
    '/activities.htm': { redirect: { to: '/activities', statusCode: 301 } },
    '/off-crbd.htm': { redirect: { to: '/births-and-deaths', statusCode: 301 } },
    '/censuses.htm': { redirect: { to: '/censuses', statusCode: 301 } },
    '/publications.htm': { redirect: { to: '/publications', statusCode: 301 } },
    '/publicationsnew.htm': { redirect: { to: '/publications', statusCode: 301 } },
    '/staff.htm': { redirect: { to: '/organisational-setup', statusCode: 301 } },
    '/rti.htm': { redirect: { to: '/rti', statusCode: 301 } },
    '/Aadhaar.htm': { redirect: { to: '/aadhaar', statusCode: 301 } },
    '/contactus.htm': { redirect: { to: '/contact', statusCode: 301 } },
    '/tenders.htm': { redirect: { to: '/tenders', statusCode: 301 } },
    '/gspb.htm': { redirect: { to: '/citizen-charter', statusCode: 301 } },
    '/otherwebsites.htm': { redirect: { to: '/related-links', statusCode: 301 } },
    '/photogallary.htm': { redirect: { to: '/gallery', statusCode: 301 } },
    '/csr-authority.htm': { redirect: { to: '/csr', statusCode: 301 } },
    '/csr-about-us.htm': { redirect: { to: '/csr/about', statusCode: 301 } },
    '/csr-projects.htm': { redirect: { to: '/csr/projects', statusCode: 301 } },
    '/csr-gallery.htm': { redirect: { to: '/csr/gallery', statusCode: 301 } },
    '/csr-contact-us.htm': { redirect: { to: '/csr/contact', statusCode: 301 } },
  },
})
