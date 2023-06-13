<template>
  <h1>时间轴</h1>
  <div class="center" style="height: 60vh">
    <div ref="container" class="time-axis-com-fit-content"></div>
  </div>
  <div class="center">当前指示时间:{{ displayDate }}</div>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import TimeAxis from './TimeAxis'
import dayjs from 'dayjs'
const container = ref<HTMLElement>()
let timeAxis: TimeAxis
const currentTime = ref(new Date())
const displayDate = computed(() => dayjs(currentTime.value).format('YYYY-MM-DD HH:mm:ss'))
onMounted(async () => {
  if (!container.value) throw new Error('container渲染失败')
  timeAxis = new TimeAxis(container.value)
  await timeAxis.ready
  timeAxis.observer.on('timeUpdate', (t) => {
    currentTime.value = t
  })
})
</script>
<style>
.center {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
