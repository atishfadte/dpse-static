<template>
  <div>
    <PageBand
      title="Statistics Day 2009"
      subtitle="Statistics Day celebrations and inauguration of the department website — Kala Academy, Panaji, 30 June 2009"
      :parent="{ label: 'Photo Gallery', to: '/gallery' }"
    />
    <div class="container">
      <p class="gallery-back">
        <NuxtLink class="btn-back" to="/gallery"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to Photo Gallery</NuxtLink>
      </p>
      <PhotoGallery :images="photos" title="Statistics Day 2009" />
    </div>
  </div>
</template>

<script setup lang="ts">
import photos from '~/data/statistics-day-2009.json'
useHead({ title: 'Statistics Day 2009 — Photo Gallery' })
</script>
