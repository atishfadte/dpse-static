// Every in-site navigation to ANOTHER page is a full page load. The GIGW
// template's scripts (header/footer injection, active-tab highlight,
// download-size tags, …) initialise once per document, so client-side route
// swaps would leave them stale. Pages are prerendered, so a full load is fast.
// Same-page changes (query/hash — incl. Nuxt restoring ?query after
// hydrating a prerendered page) stay client-side.
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  let ready = false
  nuxtApp.hook('app:mounted', () => { ready = true })
  router.beforeEach((to, from) => {
    if (!ready) return
    const norm = (p: string) => p.replace(/\/+$/, '') || '/'
    if (norm(to.path) === norm(from.path)) return
    window.location.assign(to.fullPath)
    return false
  })
})
