<template>
  <div class="app">
    <h1>TreeStore Table</h1>
    <TreeStoreTable :store="treeStore" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TreeStoreTable from './components/TreeStoreTable.vue'
import { TreeStore, type TreeItem } from './helpers/TreeStore'

const treeStore = ref<TreeStore<TreeItem>>(
  new TreeStore<TreeItem>([])
)

onMounted(() => {
  const testData: TreeItem[] = [
  { id: 1, parent: null, label: 'Айтем 1' },

  { id: '91064cee', parent: 1, label: 'Айтем 2' },
  { id: 3, parent: 1, label: 'Айтем 3' },

  { id: 4, parent: '91064cee', label: 'Айтем 4' },
  { id: 5, parent: '91064cee', label: 'Айтем 5' },
  { id: 6, parent: '91064cee', label: 'Айтем 6' },

  { id: 7, parent: 4, label: 'Айтем 7' },
  { id: 8, parent: 4, label: 'Айтем 8' },
];

  treeStore.value = new TreeStore<TreeItem>(testData)
})
</script>

<style scoped>
.app {
  padding: 20px;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
}

h1 {
  margin-bottom: 20px;
}
</style>
