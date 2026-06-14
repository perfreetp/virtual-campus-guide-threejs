<script setup>
import { computed, ref } from 'vue';
import { categories } from '../mock/campusData';

const props = defineProps({
  buildings: {
    type: Array,
    required: true
  },
  filteredBuildings: {
    type: Array,
    required: true
  },
  recommendedRoutes: {
    type: Array,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  startId: {
    type: String,
    required: true
  },
  endId: {
    type: String,
    required: true
  }
});

const emit = defineEmits([
  'update:category',
  'update:startId',
  'update:endId',
  'search',
  'routePick'
]);

const searchKeyword = ref('');

const searchOptions = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return [];
  }

  return props.buildings.filter((building) => {
    return building.name.toLowerCase().includes(keyword) || building.intro.toLowerCase().includes(keyword);
  });
});

function handleSearchSubmit() {
  const keyword = searchKeyword.value.trim().toLowerCase();
  const matched = props.buildings.find((building) => {
    return building.name.toLowerCase().includes(keyword);
  }) || searchOptions.value[0];

  emit('search', matched);
}
</script>

<template>
  <aside class="control-panel" aria-label="校园导览控制区">
    <div class="filter-row">
      <button
        v-for="item in categories"
        :key="item.value"
        class="chip"
        :class="{ active: category === item.value }"
        type="button"
        @click="emit('update:category', item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <form class="search-box" @submit.prevent="handleSearchSubmit">
      <label class="search-field">
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <circle cx="11" cy="11" r="6.2"></circle>
          <path d="m16 16 4.2 4.2"></path>
        </svg>
        <input
          v-model="searchKeyword"
          type="search"
          list="building-search-list"
          placeholder="搜索建筑 / 地点 / 功能"
          aria-label="搜索建筑"
        />
      </label>
      <button type="submit">定位</button>
      <datalist id="building-search-list">
        <option v-for="building in searchOptions" :key="building.id" :value="building.name" />
      </datalist>
    </form>

    <div class="route-box">
      <div class="route-selects">
        <label>
          <span>起点</span>
          <select :value="startId" @change="emit('update:startId', $event.target.value)">
            <option v-for="building in buildings" :key="building.id" :value="building.id">
              {{ building.name }}
            </option>
          </select>
        </label>
        <label>
          <span>终点</span>
          <select :value="endId" @change="emit('update:endId', $event.target.value)">
            <option v-for="building in buildings" :key="building.id" :value="building.id">
              {{ building.name }}
            </option>
          </select>
        </label>
      </div>

      <div class="route-buttons">
        <button
          v-for="routeItem in recommendedRoutes"
          :key="routeItem.id"
          type="button"
          @click="emit('routePick', routeItem)"
        >
          {{ routeItem.name }}
        </button>
      </div>
    </div>
  </aside>
</template>
