<template>
  <div>
    <PageBand title="Photo Gallery" />
    <div class="container">
      <div class="dpse-albums">
        <article v-for="a in albums" :key="a.to" class="card dpse-album">
          <NuxtLink :to="a.to"><img :src="a.cover" :alt="`${a.title} — album cover`" loading="lazy" /></NuxtLink>
          <div class="dpse-album-body">
            <h2><NuxtLink :to="a.to">{{ a.title }}</NuxtLink></h2>
            <p>{{ a.text }} · {{ a.count }} photos</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import statDay from '~/data/statistics-day-2009.json'
import csr from '~/data/csr-gallery.json'

useHead({ title: 'Photo Gallery' })

const albums = [
  {
    to: '/gallery/statistics-day-2009',
    title: 'Statistics Day 2009',
    text: 'Statistics Day celebrations and inauguration of the department website, Kala Academy, Panaji',
    cover: docUrl(statDay[1].src),
    count: statDay.length,
  },
  {
    to: '/csr/gallery',
    title: 'Goa CSR Authority',
    text: 'Events and initiatives of the Goa CSR Authority',
    cover: docUrl(csr[0].src),
    count: csr.length,
  },
]
</script>
