<template>
  <div>
    <AppNav app-name="MyApp" user-initial="S" @search="onSearch" />
    <main>
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
const onSearch = () => {
  // open your search modal / command palette here
}
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #f9f9fb;
  color: #111;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

main {
  min-height: calc(100vh - 56px);
}
</style>