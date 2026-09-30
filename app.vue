<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  titleTemplate: (title?: string) =>
    title
      ? `${title} | DPSE, Government of Goa`
      : 'Directorate of Planning, Statistics & Evaluation, Government of Goa',
})
</script>
