<template>
  <div>
    <PageBand
      title="Registration of Births & Deaths"
      subtitle="Office of the Chief Registrar of Births and Deaths (CRBD)"
    />
    <div class="container">
      <p>
        <a
          class="btn btn-navy"
          href="https://rbd.goa.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download digitally signed birth and death certificates — opens in new window"
        >
          <i class="svg-ico fa-solid fa-file-signature" aria-hidden="true"></i>
          Download Birth / Death Certificates online <span class="ext-ico" aria-hidden="true">&#8599;</span>
        </a>
        <br /><small>Records from 01/01/1971 onwards, on payment of ₹50 per certificate at rbd.goa.gov.in.</small>
      </p>

      <div class="prose">
        <p>
          The Registration of Births and Deaths Act, 1969 and the Goa, Daman &amp; Diu Registration of Births
          and Deaths Rules, 1970 were extended to the erstwhile Union Territory of Goa, Daman &amp; Diu with
          effect from 1 January 1971.
        </p>
        <p>
          The Director, Directorate of Planning, Statistics and Evaluation (DPSE) has been appointed by the
          State Government to function as the Chief Registrar of Births and Deaths (CRBD) — the Chief
          Executive Authority for the implementation of the Registration of Births and Deaths Act, 1969
          (Central Act No. 18 of 1969), the Registration of Births and Deaths (Amendment) Act, 2023 (Central
          Act No. 20 of 2023), and the Goa Registration of Births and Deaths Rules, 1999, with all subsequent
          amendments.
        </p>
        <p>The CRBD is responsible for:</p>
        <ul>
          <li>supervising the work of births and deaths registration across the State of Goa;</li>
          <li>issuing suitable instructions to all registration functionaries in the State;</li>
          <li>co-ordinating births and deaths related activities to bring uniformity and secure an official system of registration; and</li>
          <li>collecting statistical information on registered births and deaths from Registrars, and compiling and publishing statistical reports.</li>
        </ul>
        <p>
          The State of Goa has <strong>206 birth and death registration units</strong>: 191 Offices of Village
          Panchayats, 13 Municipal Councils, 1 Corporation, and 1 special registration unit at Goa Medical
          College, Bambolim. All records from 01/01/1971 onwards are computerised through software developed
          by the National Informatics Centre, Goa.
        </p>
        <p>
          Goa is one of the States where the level of registration is consistently at 100% — the Civil
          Registration System functions effectively and efficiently.
        </p>
      </div>

      <h2>Civil Registration System Functionaries</h2>
      <div class="table-wrap">
        <table class="data-table stack-sm">
          <thead>
            <tr><th scope="col">Role</th><th scope="col">Officer / Office</th><th scope="col">Phone</th></tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Role"><strong>Chief Registrar of Births and Deaths</strong></td>
              <td data-label="Officer / Office">Shri Vijay B. Saxena, Director — Pt. Deendayal Upadhyay Bhavan, Porvorim</td>
              <td data-label="Phone">0832-2417445</td>
            </tr>
            <tr>
              <td data-label="Role"><strong>Additional Chief Registrar</strong></td>
              <td data-label="Officer / Office">Shri Noel Fernandes, Deputy Director</td>
              <td data-label="Phone">0832-2417441</td>
            </tr>
            <tr>
              <td data-label="Role"><strong>District Registrar (North)</strong></td>
              <td data-label="Officer / Office">Additional Collector (North)</td>
              <td data-label="Phone">0832-2223612</td>
            </tr>
            <tr>
              <td data-label="Role"><strong>District Registrar (South)</strong></td>
              <td data-label="Officer / Office">Additional Collector (South)</td>
              <td data-label="Phone">0832-2705333</td>
            </tr>
            <tr>
              <td data-label="Role"><strong>Additional District Registrars</strong></td>
              <td data-label="Officer / Office">
                All twelve Block Development Officers (Tiswadi, Ponda, Bardez, Pernem, Bicholim, Sattari,
                Salcete, Sanguem, Canacona, Quepem, Mormugao, Dharbandora)
              </td>
              <td data-label="Phone">—</td>
            </tr>
            <tr>
              <td data-label="Role"><strong>Registrars</strong></td>
              <td data-label="Officer / Office">
                Commissioner / Chief Officers of the Corporation and Municipal Councils; the Medical
                Superintendent, Goa Medical College; and all Village Panchayat Secretaries for their
                respective jurisdictions
              </td>
              <td data-label="Phone">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Acts, Rules &amp; Notifications</h2>
      <DocList :items="docs" title-header="Document" />
    </div>
  </div>
</template>

<script setup lang="ts">
import allDocs from '~/data/births-deaths-docs.json'
useHead({ title: 'Registration of Births & Deaths' })
// the certificate-download portal link is surfaced in the button above
const docs = allDocs.filter(d => !isExternal(d.href))
</script>
