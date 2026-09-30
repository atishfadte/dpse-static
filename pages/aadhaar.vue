<template>
  <div>
    <PageBand
      title="Aadhaar Services"
      subtitle="DPSE is the State UID Registrar / Nodal Department for Aadhaar in Goa"
    />
    <div class="container">
      <p>
        <a
          class="btn btn-navy"
          href="https://myaadhaar.uidai.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="My Aadhaar — download or update, opens in new window"
        >My Aadhaar — download / update <span class="ext-ico" aria-hidden="true">&#8599;</span></a>
        &nbsp;
        <a
          class="btn btn-outline"
          href="https://uidai.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="UIDAI official portal — opens in new window"
        >UIDAI — official portal <span class="ext-ico" aria-hidden="true">&#8599;</span></a>
      </p>

      <h2>Documents, Circulars &amp; Notifications</h2>
      <DocList :items="docs" title-header="Document" />
    </div>
  </div>
</template>

<script setup lang="ts">
import allDocs from '~/data/aadhaar.json'
useHead({ title: 'Aadhaar Services' })
// portal links are surfaced as buttons above
const docs = allDocs.filter(d => !isExternal(d.href))
</script>
