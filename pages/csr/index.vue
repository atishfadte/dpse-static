<template>
  <div>
    <PageBand title="Goa CSR Authority" subtitle="Goa Corporate Social Responsibility Authority" />
    <div class="container">
      <div class="grid grid-3 dpse-people">
        <article v-for="p in leadership" :key="p.name" class="card person-card">
          <img v-if="p.img" class="person-photo" :src="p.img" :alt="p.name" loading="lazy" />
          <span v-else class="person-photo person-avatar" aria-hidden="true">
            <i class="svg-ico fa-solid fa-user-tie" aria-hidden="true"></i>
          </span>
          <h3>{{ p.name }}</h3>
          <p class="person-role">{{ p.role }}</p>
        </article>
      </div>

      <h2>Explore</h2>
      <div class="feature-grid">
        <article v-for="l in links" :key="l.to" class="card feature-card">
          <span class="dpse-feature-ico" aria-hidden="true">
            <i :class="`svg-ico fa-solid ${l.icon}`" aria-hidden="true"></i>
          </span>
          <div class="feature-text">
            <h3><NuxtLink :to="l.to">{{ l.title }}</NuxtLink></h3>
            <p>{{ l.text }}</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Goa CSR Authority' })
const leadership = [
  { name: 'Dr. Pramod Sawant', role: "Hon'ble Chief Minister / Chairman, Goa CSR Authority", img: '/CM-Dr-Promod-Sawant.png' },
  { name: 'Dr. Sanjay Goel, IAS', role: 'Commissioner cum Secretary (PWD) / Chief Executive Officer, Goa CSR Authority', img: '' },
  { name: 'Shri Vijay B. Saxena', role: 'Director (DPSE) / Joint Chief Executive Officer, Goa CSR Authority', img: '' },
]
const links = [
  { to: '/csr/about', icon: 'fa-building', title: 'About the Authority', text: 'Mandate, registration and objectives.' },
  { to: '/csr/projects', icon: 'fa-briefcase', title: 'Projects & Initiatives', text: 'CSR projects implemented across Goa.' },
  { to: '/csr/gallery', icon: 'fa-images', title: 'Gallery', text: 'Photographs of CSR events and initiatives.' },
  { to: '/csr/contact', icon: 'fa-envelope', title: 'Contact', text: 'Reach the Goa CSR Authority.' },
]
</script>
