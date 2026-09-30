<template>
  <div>
    <PageBand title="Publications" subtitle="Statistical reports and documents published by the Directorate" />
    <div class="container">
      <div class="pub-filter">
        <label for="pub-search">Search publications</label>
        <input
          id="pub-search"
          v-model="query"
          type="search"
          placeholder="e.g. Economic Survey, Statistical Hand Book, 2023-24"
          autocomplete="off"
        />
      </div>

      <template v-for="group in filteredGroups" :key="group.name">
        <h2 class="pub-group-h">{{ group.name }} <small>({{ group.items.length }})</small></h2>
        <DocList :items="group.items" title-header="Publication" />
      </template>

      <p v-if="!filteredGroups.length">No publications match your search.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import current from '~/data/publications.json'
import archive from '~/data/publications-archive.json'

useHead({ title: 'Publications' })

interface DocItem { title: string; href: string }

// merge current + archived listings, first occurrence of an href wins
const merged: DocItem[] = []
const seen = new Set<string>()
for (const item of [...current, ...archive] as DocItem[]) {
  if (seen.has(item.href)) continue
  seen.add(item.href)
  merged.push(item)
}

const seriesOf = (title: string) => {
  const s = title.replace(/\s*(19|20)\d{2}.*$/, '').replace(/\s*\d{2}-\d{2}\s*$/, '').trim()
  return s.length >= 4 ? s : title
}

const groupsAll = (() => {
  const map = new Map<string, DocItem[]>()
  for (const item of merged) {
    const key = seriesOf(item.title)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
})()

const query = ref('')
const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return groupsAll
  return groupsAll
    .map(g => ({ name: g.name, items: g.items.filter(i => i.title.toLowerCase().includes(q)) }))
    .filter(g => g.items.length)
})
</script>
