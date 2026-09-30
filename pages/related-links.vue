<template>
  <div>
    <PageBand title="Related Links" subtitle="Government portals and statistical organisations" />
    <div class="container">
      <DocList :items="sites" title-header="Website" action-header="Visit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import sites from '~/data/related-websites.json'
useHead({ title: 'Related Links' })
</script>
