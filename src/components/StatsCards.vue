<script setup>
defineProps({
  stats: {
    type: Array,
    required: true
  }
});
</script>

<template>
  <section class="stats-grid" aria-label="校园数据统计">
    <article v-for="item in stats" :key="item.label" class="stat-card">
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <p>{{ item.hint }}</p>
    </article>
  </section>
</template>
