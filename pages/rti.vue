<template>
  <div>
    <PageBand title="Right to Information" subtitle="Disclosures under the RTI Act, 2005" />
    <div class="container">
      <DocList :items="docs" title-header="Disclosure" />
    </div>
  </div>
</template>

<script setup lang="ts">
import docs from '~/data/rti.json'
useHead({ title: 'Right to Information' })
</script>
