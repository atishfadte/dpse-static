<template>
  <div>
    <PageBand title="About Us" subtitle="Role and structure of the Directorate" />
    <div class="container">
      <div class="prose">
        <p>
          The Directorate of Planning, Statistics &amp; Evaluation is entrusted with statistical activities in
          the State in terms of collection, compilation, dissemination and analysis of data for planning and
          decision making. It is also the Nodal Department for conducting National level Censuses and Surveys
          in which the State of Goa is a participant. The Directorate also functions as the Chief Executive
          body for the smooth implementation of the Registration of Births and Deaths Act (Central Act).
        </p>
        <p>
          Besides, the Directorate is designated as the State UID Registrar / Nodal Department for the smooth
          implementation and monitoring of the UID (Aadhaar) Project in the State.
        </p>
        <p>
          This Department does not implement any beneficiary-oriented schemes. However, it is involved in
          service delivery to the public in terms of registration of births and deaths and Aadhaar.
        </p>
        <p>
          Officers and officials of the Common Statistical Cadre appointed by the Directorate are also posted
          in the Statistical Cells of various Departments of the State Government. These Cells collect,
          compile, analyse and disseminate data relevant to the functions of the concerned Departments.
        </p>
      </div>

      <h2>Organisation Structure</h2>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th scope="col">Division</th><th scope="col">Function</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in divisions" :key="d.n">
              <td data-label="Division">Division {{ d.n }}</td>
              <td data-label="Function">{{ d.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'About Us' })
const divisions = [
  { n: 'I', name: 'Administration and Accounts' },
  { n: 'II', name: 'Publication' },
  { n: 'III', name: 'Planning' },
  { n: 'IV', name: 'State Income and Co-ordination' },
  { n: 'V', name: 'Evaluation' },
  { n: 'VI', name: 'National Sample Survey' },
  { n: 'VII', name: 'Registration of Births and Deaths and Price Index' },
  { n: 'VIII', name: 'Goa Corporate Social Responsibility Authority' },
]
</script>
