<template>
  <!-- GIGW template download table (same markup tables.js emits) -->
  <div class="table-wrap dpse-doclist">
    <!-- stack-sm: the template's CSS-only mobile card layout. Without it main.js makes the
         table "collapsible" by inserting detail rows mid-hydration, and Vue drops rows. -->
    <table class="data-table dl-table has-actions stack-sm">
      <thead>
        <tr>
          <th scope="col">Sr No</th>
          <th scope="col">{{ titleHeader }}</th>
          <th scope="col">{{ actionHeader }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, i) in items" :key="i">
          <td data-label="Sr No">{{ i + 1 }}</td>
          <td :data-label="titleHeader">{{ item.title }}</td>
          <td :data-label="actionHeader">
            <a
              v-if="!isExternal(item.href)"
              class="dl-btn"
              :href="docUrl(item.href)"
              :data-file-type="fileType(item.href)"
              download
              :aria-label="`Download ${item.title} (${fileType(item.href).toUpperCase()})`"
            >
              <i class="svg-ico fa-solid fa-download" aria-hidden="true"></i>
              Download
              <!-- type + size tag is appended by the template main.js (e.g. "PDF, 1.4 MB") -->
            </a>
            <a
              v-else
              class="dl-btn"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${item.title} — opens in new window`"
            >
              <i class="svg-ico fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              Visit
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
interface DocItem { title: string; href: string }
withDefaults(defineProps<{ items: DocItem[]; titleHeader?: string; actionHeader?: string }>(), {
  titleHeader: 'Title',
  actionHeader: 'Download',
})
const fileType = (href: string) => (href.match(/\.([a-z0-9]+)$/i)?.[1] || 'pdf').toLowerCase()
</script>
