<template>
  <div>
    <PageBand title="Citizen Charter" />
    <div class="container">
      <DocList :items="docs" title-header="Document" />
    </div>
  </div>
</template>

<script setup lang="ts">
import raw from '~/data/citizen-charter.json'
useHead({ title: 'Citizen Charter' })
const docs = raw.map(d => ({ ...d, title: d.title === 'Citizen Charter' ? 'Citizen Charter 2024' : d.title }))
</script>
