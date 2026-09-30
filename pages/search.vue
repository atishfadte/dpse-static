<template>
  <div>
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <NuxtLink to="/">Home</NuxtLink>
        <span class="bc-sep" aria-hidden="true">&rsaquo;</span>
        <span aria-current="page">Search</span>
      </nav>
      <h1>Search</h1>
      <form class="search-page-form" role="search" action="/search/" method="get">
        <i class="svg-ico fa-solid fa-magnifying-glass search-page-ico" aria-hidden="true"></i>
        <label class="visually-hidden" for="q">Search the website</label>
        <input id="q" name="q" type="search" placeholder="Search pages, sections and more…" autocomplete="off" autofocus />
        <button type="submit" class="search-page-btn">Search</button>
      </form>
      <p class="search-status" id="search-status" role="status" aria-live="polite"></p>
      <div class="search-results" id="search-results"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Search',
  // the GIGW template's client-side search; crawls /data/routes.json at runtime
  script: [{ src: '/resources/assets/js/search.js', tagPosition: 'bodyClose' }],
})
</script>
