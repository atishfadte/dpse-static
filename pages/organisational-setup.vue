<template>
  <div>
    <PageBand title="Organisational Setup" subtitle="Officers of the Directorate" />
    <div class="container">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th scope="col">Designation</th><th scope="col">Officer(s)</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in staff" :key="row.designation">
              <td data-label="Designation"><strong>{{ row.designation }}</strong></td>
              <td data-label="Officer(s)">
                <ul v-if="row.names.length > 1">
                  <li v-for="n in row.names" :key="n">{{ n }}</li>
                </ul>
                <span v-else>{{ row.names[0] || '—' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Officers / officials of the Common Statistical Cadre are also posted in the Statistical Cells of various
        State Government Departments.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Organisational Setup' })
const staff = [
  { designation: 'Director', names: ['Shri Vijay B. Saxena (Tel: 0832-2417445)'] },
  { designation: 'Joint Director', names: ['—'] },
  { designation: 'Deputy Director', names: ['Kum. Neumani M. Rodrigues', 'Dr. Kailas D. Gokhale', 'Shri Noel Fernandes'] },
  { designation: 'Statistical Officer', names: ['Shri Babaji V. Gaonkar', 'Shri Subhash J. Gaonkar'] },
  {
    designation: 'Research Assistant',
    names: [
      'Shri Ramnath Naik', 'Smt. Vandana P. N. Panvelkar', 'Smt. Lidia Colaco', 'Shri Deepak V. Raut',
      'Shri Ralph Barbosa', 'Smt. Zozima Fernandes', 'Shri Amol Sawant', 'Shri Shivanand Alornecar',
      'Smt. Supriya Henriques', 'Shri Ditesh G. Rivankar',
    ],
  },
]
</script>
