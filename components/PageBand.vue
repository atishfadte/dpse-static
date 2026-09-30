<template>
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">Home</NuxtLink>
      <span class="bc-sep" aria-hidden="true">&rsaquo;</span>
      <template v-if="parent">
        <NuxtLink :to="parent.to">{{ parent.label }}</NuxtLink>
        <span class="bc-sep" aria-hidden="true">&rsaquo;</span>
      </template>
      <span aria-current="page">{{ title }}</span>
    </nav>
    <h1>{{ title }}</h1>
    <p v-if="subtitle" class="lead">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; parent?: { label: string; to: string } }>()
</script>
