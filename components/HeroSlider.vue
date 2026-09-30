<template>
  <section
    class="dpse-slider"
    aria-roledescription="carousel"
    aria-label="Highlights"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="hovering = true"
    @focusout="hovering = false"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div class="dpse-slides" :aria-live="playing ? 'off' : 'polite'">
      <div
        v-for="(s, i) in slides"
        :key="s.src"
        class="dpse-slide"
        :class="{ 'is-active': i === current }"
        role="group"
        aria-roledescription="slide"
        :aria-label="`Slide ${i + 1} of ${slides.length}`"
        :aria-hidden="i === current ? 'false' : 'true'"
      >
        <!-- blurred copy fills the full width; the sharp photo sits on top -->
        <div class="dpse-slide-bg" :style="{ backgroundImage: `url('${docUrl(s.src)}')` }" aria-hidden="true"></div>
        <NuxtLink v-if="s.href" :to="s.href" class="dpse-slide-media" :tabindex="i === current ? 0 : -1">
          <img :src="docUrl(s.src)" :alt="s.alt" :loading="i === 0 ? 'eager' : 'lazy'" :fetchpriority="i === 0 ? 'high' : 'auto'" />
        </NuxtLink>
        <div v-else class="dpse-slide-media">
          <img :src="docUrl(s.src)" :alt="s.alt" :loading="i === 0 ? 'eager' : 'lazy'" />
        </div>
        <p v-if="s.caption" class="dpse-slide-caption"><span>{{ s.caption }}</span></p>
      </div>
    </div>

    <div v-if="slides.length > 1" class="dpse-slider-controls" role="group" aria-label="Slideshow controls">
      <button type="button" aria-label="Previous slide" @click="go(current - 1)">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <button type="button" :aria-label="playing ? 'Pause slideshow' : 'Play slideshow'" :aria-pressed="!playing" @click="toggle">
        <i :class="playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'" aria-hidden="true"></i>
      </button>
      <button type="button" aria-label="Next slide" @click="go(current + 1)">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>

    <div v-if="slides.length > 1" class="dpse-slider-dots" role="group" aria-label="Choose slide">
      <button
        v-for="(s, i) in slides"
        :key="s.src"
        type="button"
        :class="{ 'is-active': i === current }"
        :aria-label="`Go to slide ${i + 1}`"
        :aria-current="i === current ? 'true' : undefined"
        @click="go(i)"
      ></button>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Slide { src: string; alt: string; caption?: string; href?: string }
const props = withDefaults(defineProps<{ slides: Slide[]; interval?: number }>(), { interval: 6000 })

const current = ref(0)
const playing = ref(true)
const hovering = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let touchX = 0

function go (i: number) {
  const n = props.slides.length
  current.value = (i + n) % n
}
function toggle () { playing.value = !playing.value }
function onTouchStart (e: TouchEvent) { touchX = e.changedTouches[0].clientX }
function onTouchEnd (e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 50) go(current.value + (dx < 0 ? 1 : -1))
}

onMounted(() => {
  // no auto-advance for visitors who ask for reduced motion (WCAG 2.2.2)
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) playing.value = false
  timer = setInterval(() => {
    if (playing.value && !hovering.value && !document.hidden) go(current.value + 1)
  }, props.interval)
})
onBeforeUnmount(() => clearInterval(timer))
</script>
