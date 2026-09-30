<template>
  <div>
    <HeroSlider :slides="banners" />

    <section class="dpse-intro">
      <div class="container">
        <h1>Planning, Statistics &amp; Evaluation for the State of Goa</h1>
        <p class="lead">
          The Directorate is the nodal agency for statistical activities in Goa — collection, compilation,
          dissemination and analysis of data for planning and decision making. It conducts national censuses
          and surveys, implements the Registration of Births &amp; Deaths Act, and serves as the State UID
          Registrar for the Aadhaar project.
        </p>
        <div class="dpse-actions">
          <NuxtLink to="/publications" class="btn btn-navy">Browse Publications</NuxtLink>
          <a
            href="https://rbd.goa.gov.in"
            class="btn btn-outline"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Birth / Death certificate download — opens in new window"
          >Birth / Death Certificate Download <span class="ext-ico" aria-hidden="true">&#8599;</span></a>
          <NuxtLink to="/tenders" class="btn btn-outline">Tenders</NuxtLink>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2>Our Services</h2>
        <div class="feature-grid">
          <article v-for="card in cards" :key="card.title" class="card feature-card">
            <span class="dpse-feature-ico" aria-hidden="true">
              <i :class="`svg-ico fa-solid ${card.icon}`" aria-hidden="true"></i>
            </span>
            <div class="feature-text">
              <h3><NuxtLink :to="card.to">{{ card.title }}</NuxtLink></h3>
              <p>{{ card.text }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <h2>Notices &amp; Announcements</h2>
        <DocList :items="announcements" title-header="Notice" />
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2>Key Documents</h2>
        <DocList :items="keyDocs" title-header="Document" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import notices from '~/data/notices.json'
import banners from '~/data/home-banners.json'

useHead({ title: 'Home', bodyAttrs: { class: 'is-home' } })

// Vision / framework documents are highlighted separately from running notices
const KEY_DOC_HREFS = new Set([
  'Vision Document 2030.pdf',
  'Goa-State Indicator Framework (Version 1.0) March 2022.pdf',
  'Vision Document 2020-21.pdf',
])
const announcements = notices.filter(n => !KEY_DOC_HREFS.has(n.href))
const keyDocs = notices.filter(n => KEY_DOC_HREFS.has(n.href))

const cards = [
  { icon: 'fa-book-open', title: 'Statistical Publications', text: 'Handbooks, surveys, reports and economic indicators of Goa.', to: '/publications' },
  { icon: 'fa-file-certificate', title: 'Births & Deaths', text: 'Civil registration under the RBD Act and certificate download.', to: '/births-and-deaths' },
  { icon: 'fa-fingerprint', title: 'Aadhaar Services', text: 'Enrolment, updates and Aadhaar-related notifications for Goa.', to: '/aadhaar' },
  { icon: 'fa-hands-holding-heart', title: 'Goa CSR Authority', text: 'Corporate Social Responsibility projects across the State.', to: '/csr' },
]
</script>
