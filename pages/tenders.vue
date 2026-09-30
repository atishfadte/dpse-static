<template>
  <div>
    <PageBand title="Tenders" subtitle="Tender and auction notices of the Directorate" />
    <div class="container">
      <p><strong>There are no active tenders at present.</strong></p>

      <h2>Archived tender &amp; auction notices</h2>
      <DocList :items="archive" title-header="Notice" />
    </div>
  </div>
</template>

<script setup lang="ts">
import archive from '~/data/tenders-archive.json'
useHead({ title: 'Tenders' })
</script>
