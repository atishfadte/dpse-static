<template>
  <div>
    <PageBand title="Censuses" subtitle="Censuses and centrally sponsored schemes conducted by the Directorate" />
    <div class="container">
      <div class="prose">
        <p>
          The Directorate conducts various censuses such as the Agriculture Census, Economic Census, Livestock
          Census and the Census of Government Employees.
        </p>
        <p>
          A special Statistics Cell is set up in the Directorate for the collection, compilation and
          tabulation of data relating to sources of Minor Irrigation in the State, furnishing various reports
          to the Ministry of Water Resources, Government of India, from time to time.
        </p>
        <p>
          <em>
            As per the Cabinet decision of the Government, the Minor Irrigation Census stands transferred to
            the State Water Resources Department with effect from December 2022.
          </em>
        </p>
      </div>

      <h2>Centrally Sponsored Schemes</h2>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Sr No</th><th scope="col">Scheme</th></tr></thead>
          <tbody>
            <tr><td data-label="Sr No">1</td><td data-label="Scheme">Agriculture Censuses</td></tr>
            <tr><td data-label="Sr No">2</td><td data-label="Scheme">Minor Irrigation Censuses</td></tr>
            <tr><td data-label="Sr No">3</td><td data-label="Scheme">Economic Censuses</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Census reports are available on the <NuxtLink to="/publications">Publications</NuxtLink> page.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Censuses' })
</script>
