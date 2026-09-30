<template>
  <div>
    <PageBand
      title="CSR Gallery"
      subtitle="Goa CSR Authority — events and initiatives"
      :parent="{ label: 'CSR Authority', to: '/csr' }"
    />
    <div class="container">
      <PhotoGallery :images="photos" title="Goa CSR Authority" />
    </div>
  </div>
</template>

<script setup lang="ts">
import images from '~/data/csr-gallery.json'
useHead({ title: 'CSR Gallery' })
const photos = images.map((img, i) => ({ src: img.src, caption: `Goa CSR Authority — photo ${i + 1}` }))
</script>
