<template>
  <div>
    <PageBand title="About the Goa CSR Authority" :parent="{ label: 'CSR Authority', to: '/csr' }" />
    <div class="container">
      <div class="prose">
        <p>
          The Government created the Goa Corporate Social Responsibility Authority (Goa CSR Authority) as a
          proper institutional arrangement under the Government, so that assets created under CSR initiatives
          are taken care of at both the implementation and maintenance stages.
        </p>
        <p>
          The Goa CSR Authority is registered with the Registrar of Companies, Ministry of Corporate Affairs,
          vide Registration No. CSR00011574, and under the Societies Registration Act, 1860 vide Registration
          No. 17/GOA/2021. The Authority serves as a channel through which CSR funds are utilised to execute
          projects across various Government Departments, with an emphasis on projects that benefit the Goan
          community and contribute towards the betterment of local society.
        </p>
        <p>
          Since its formation, the Goa CSR Authority has been making all-out efforts to create its own
          identity, striving to reach out to Corporates, PSUs and Central Government Institutions to motivate
          them to contribute CSR funds towards various sectors of the economy across the State.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'About the Goa CSR Authority' })
</script>
