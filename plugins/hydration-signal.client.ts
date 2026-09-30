// Tell the GIGW template scripts (includes.js loader) that Vue has finished
// hydrating. main.js decorates the DOM (file-size tags, email obfuscation,
// table tweaks); if it runs mid-hydration Vue resets those nodes as
// "mismatches" — and has dropped whole table rows. includes.js waits for this.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:suspense:resolve', () => {
    ;(window as any).__dpseHydrated = true
    window.dispatchEvent(new Event('dpse:hydrated'))
  })
})
