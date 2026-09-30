<template>
  <div>
    <PageBand title="Activities" subtitle="Functions and duties of the Directorate" />
    <div class="container">
      <h2>A. Functions / Duties of the Directorate</h2>
      <div class="prose">
        <ol>
          <li v-for="(f, i) in functions" :key="i">{{ f }}</li>
        </ol>
      </div>

      <div v-for="sec in sections" :key="sec.title">
        <h2>{{ sec.title }}</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th scope="col">Sr No</th><th scope="col">Item</th></tr></thead>
            <tbody>
              <tr v-for="(item, i) in sec.items" :key="i">
                <td data-label="Sr No">{{ i + 1 }}</td>
                <td data-label="Item">{{ item }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h2>F. Other Programmes / Activities</h2>
      <div class="prose">
        <p>
          <strong>Swayampurna Goa:</strong> in line with the Atmanirbhar Bharat Programme of the Government of
          India, the State Government implements the Swayampurna Goa Programme with the sole objective of taking
          beneficiary-oriented schemes to the doorstep of the eligible person, thereby achieving the target of
          self-reliance.
        </p>
        <p>
          <strong>Atal Gram Development Agency Goa</strong> under the Atal Gram Yojana Scheme, to tap the full
          economic potential of villages covering agriculture and allied sectors in particular, besides
          developing hinterland tourism.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Activities' })

const functions = [
  'Collection, dissemination, scrutiny and compilation of statistical data pertaining to various socio-economic parameters of the State for bringing out regular publications and census reports.',
  'Effective implementation and monitoring of the provisions of the Registration of Births and Deaths Act (Central Act) and State Rules, along with subsequent amendments from time to time.',
  'Evaluation of development programmes / schemes covering achievements, socio-economic impact, operations, areas of success, failure and lacunae, and analysis of the results as per Government decisions.',
  'Conduct of censuses and surveys as per National / State guidelines and timelines: Quinquennial Agriculture Census and Input Survey; Quinquennial Economic Census; Census of Government Employees; and other censuses / surveys as per Government decisions. (The Minor Irrigation Census and Census of Water Bodies stand transferred to the State Water Resources Department with effect from December 2022.)',
  'Lending hand-holding support to the Directorate of Census Operations, Office of the Registrar General of India, Regional Office Goa, to conduct and monitor the decennial Population Census.',
  'Monitoring and review of scheme-wise financial progress / expenditure of all Government Departments.',
  'Co-ordinating and liaising with the NITI Aayog and State Departments for framing the State Indicator Framework (SIF) and monitoring the Sustainable Development Goals (SDGs) for the State.',
  'Budget analysis and compilation of estimates of State Domestic Product / State Income in consultation with the Central Statistics Office, MoSPI, Government of India and State line Departments.',
  'Implementation and monitoring of the Unique Identification (UID) / Aadhaar Project in the State; the Directorate also functions as an Aadhaar Centre attending to grievance cases of the public.',
  'Co-ordinating with the Direct Benefit Transfer (DBT) Mission, Cabinet Secretariat, New Delhi and DBT-implementing State Departments for monitoring and reporting of DBT schemes on the State DBT portal.',
  'Conduct of National Sample Surveys (NSS) in the State on par with those implemented by the Central Government.',
  'Conduct of the Annual Survey of Industries (ASI) and computation of the Index of Industrial Production (IIP) as per the direction of NSSO, Kolkata.',
  'Computation of the Consumer Price Index for middle-class non-manual employees, and supply of retail price data from selected markets in Goa to the Labour Bureau, Chandigarh for the CPI for Industrial Workers.',
  'Computation of tables relating to average wholesale / retail prices of important commodities consumed by middle-class people in important towns of Goa.',
  'As the co-ordinating Department of the Goa Corporate Social Responsibility Authority, ensuring CSR funds received from corporate entities are utilised for the betterment of all sections of society across the State.',
  'Monitoring the implementation of the Public Finance Management System (PFMS) in Goa for funds released under Centrally Sponsored Schemes.',
]

const sections = [
  {
    title: 'B. Censuses',
    items: [
      'Agriculture Census and Input Survey (Quinquennial)',
      'Economic Census (Quinquennial)',
      'Census of Government Employees',
      'Other censuses / surveys as per Government decisions',
    ],
  },
  {
    title: 'C. Surveys',
    items: [
      'National Sample Survey (socio-economic data on current topics, as per NSSO / MoSPI guidelines)',
      'Annual Survey of Industries',
      'Index of Industrial Production',
    ],
  },
  {
    title: 'D. Reports and Publications',
    items: [
      'Annual Report on Registration of Births and Deaths in Goa',
      'Annual Report on Rural Wages',
      'Annual Report on Credit Deposit Ratio in Goa',
      'Annual Report on Price Trends in Goa',
      'Statistical Handbook of Goa',
      'Goa Economy in Figures',
      'Indicators of Socio-Economic Development',
      'Goa at a Glance',
      'Action Taken Report on announcements made in the Budget Speech',
      'Report on NSS Rounds',
    ],
  },
  {
    title: 'E. Documents',
    items: [
      'Economic Survey — annual portrait of the economic scenario of the State',
      "Governor's Address / Speech",
      'Explanatory Memorandum — brief description of schemes with budget allocations',
      'Budget in Brief — an analytical document of public finance',
    ],
  },
]
</script>
