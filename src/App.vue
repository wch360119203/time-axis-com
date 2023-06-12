<template>
  <h1>时间轴</h1>
  <div class="center" style="height: 60vh">
    <div ref="container" class="time-axis-com-fit-content"></div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TimeAxis from './TimeAxis'
const container = ref<HTMLElement>()
let timeAxis: TimeAxis
onMounted(async () => {
  if (!container.value) throw new Error('container渲染失败')
  timeAxis = new TimeAxis(container.value)
  await timeAxis.ready
})
</script>
<style>
.center {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
