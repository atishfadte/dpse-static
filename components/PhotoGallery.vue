<template>
  <div>
    <ul class="dpse-photo-grid" role="list">
      <li v-for="(img, i) in images" :key="img.src">
        <button
          type="button"
          class="dpse-photo-tile"
          :aria-label="`Open ${img.caption || `photo ${i + 1}`} in image viewer`"
          @click="open(i)"
        >
          <img :src="docUrl(img.thumb || img.src)" :alt="img.caption || `Photo ${i + 1}`" loading="lazy" />
        </button>
      </li>
    </ul>

    <!-- Viewer: reuses the GIGW template's .img-lightbox / .ilb-btn styling -->
    <div
      v-if="current !== null"
      ref="viewer"
      class="img-lightbox dpse-viewer"
      data-open="true"
      role="dialog"
      aria-modal="true"
      :aria-label="`Image viewer — ${title || 'gallery'}`"
      @click.self="close"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <button ref="closeBtn" class="ilb-btn ilb-close" type="button" aria-label="Close image viewer" @click="close">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <button v-if="images.length > 1" class="ilb-btn ilb-prev" type="button" aria-label="Previous image" @click="step(-1)">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>

      <figure>
        <img :key="images[current].src" :src="docUrl(images[current].src)" :alt="images[current].caption || `Photo ${current + 1}`" />
        <figcaption>
          <span v-if="images[current].caption">{{ images[current].caption }}</span>
          <span class="dpse-viewer-count" aria-live="polite">{{ current + 1 }} / {{ images.length }}</span>
        </figcaption>
      </figure>

      <button v-if="images.length > 1" class="ilb-btn ilb-next" type="button" aria-label="Next image" @click="step(1)">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Photo { src: string; thumb?: string; caption?: string }
const props = defineProps<{ images: Photo[]; title?: string }>()

const current = ref<number | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
let opener: Element | null = null
let touchX = 0

function open (i: number) {
  opener = document.activeElement
  current.value = i
  document.documentElement.style.overflow = 'hidden'
  nextTick(() => closeBtn.value?.focus())
  preload(i)
}
function close () {
  current.value = null
  document.documentElement.style.overflow = ''
  if (opener instanceof HTMLElement) opener.focus()
}
function step (d: number) {
  if (current.value === null) return
  const n = props.images.length
  current.value = (current.value + d + n) % n
  preload(current.value)
}
// warm the neighbours so next/prev feels instant
function preload (i: number) {
  const n = props.images.length
  for (const j of [(i + 1) % n, (i - 1 + n) % n]) new Image().src = docUrl(props.images[j].src)
}
function onKey (e: KeyboardEvent) {
  if (current.value === null) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
}
function onTouchStart (e: TouchEvent) { touchX = e.changedTouches[0].clientX }
function onTouchEnd (e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
})
// Deep link: ?photo=N opens that photo (used by the legacy album redirect pages).
// Watched rather than read on mount: Nuxt hydrates prerendered pages with the
// query stripped and restores it just after.
const route = useRoute()
watch(() => route.query.photo, (v) => {
  if (import.meta.server) return
  const n = parseInt(String(v || ""), 10)
  if (n >= 1 && n <= props.images.length && current.value === null) open(n - 1)
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = ''
})
</script>
