<template>
  <div>
    <!-- GIGW template chrome: header (top util bar + masthead + nav) and footer
         are injected by /resources/assets/js/includes.js from /data/gigw/*.json -->
    <div data-include="header"></div>

    <main id="main-content" class="page-body gigw-tpl gigw-tpl-classic">
      <slot />
    </main>

    <footer class="site-footer" data-include="footer"></footer>
  </div>
</template>
