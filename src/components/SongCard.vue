<script setup>
import { computed } from 'vue'
import { getCoverUrl } from '../api/divingFish.js'

const props = defineProps({
  song: Object,
  rank: Number,
  targetThreshold: Number
})

// 计算达成率差距
const achievementGap = computed(() => {
  if (!props.song.record) return null
  return (props.targetThreshold - props.song.record.achievements).toFixed(4)
})

// 获取评级颜色
function getRateColor(rate) {
  const colors = {
    'd': '#888',
    'c': '#888',
    'b': '#4caf50',
    'bb': '#4caf50',
    'bbb': '#4caf50',
    'a': '#2196f3',
    'aa': '#2196f3',
    'aaa': '#2196f3',
    's': '#ff9800',
    's+': '#ff9800',
    'ss': '#ff9800',
    'ss+': '#ff9800',
    'sss': '#e91e63',
    'sss+': '#e91e63'
  }
  return colors[rate?.toLowerCase()] || '#888'
}
</script>

<template>
  <div class="song-card">
    <div class="rank">{{ rank }}</div>

    <img
      :src="getCoverUrl(song.id)"
      :alt="song.title"
      class="cover"
      @error="$event.target.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22>?</text></svg>'"
    />

    <div class="info">
      <div class="title">{{ song.title }}</div>
      <div class="meta">
        <span class="type">{{ song.type }}</span>
        <span class="diff-label" :class="{ 're-master': song.diffLabel === 'Re:Master' }">
          {{ song.diffLabel || 'Master' }}
        </span>
        <span class="ds">定数: {{ song.ds }}</span>
        <span class="fit-diff" v-if="song.fitDiff">
          拟合: {{ song.fitDiff.toFixed(2) }}
        </span>
        <span class="range-badge" v-if="song.tier?.tier === 'range'">
          {{ song.tier.rangeMin }}-{{ song.tier.rangeMax }}档
        </span>
      </div>
    </div>

    <div class="achievement" v-if="song.record">
      <div class="current" :style="{ color: song.record.achievements >= targetThreshold ? '#4caf50' : '#ff9800' }">
        {{ song.record.achievements.toFixed(4) }}%
      </div>
      <div class="gap" v-if="achievementGap > 0">
        差 {{ achievementGap }}%
      </div>
      <div class="rate" :style="{ color: getRateColor(song.record.rate) }">
        {{ song.record.rate?.toUpperCase() }}
      </div>
    </div>

    <div class="no-record" v-else>
      <span>无成绩</span>
    </div>
  </div>
</template>

<style scoped>
.song-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #1a1a2e;
  border-radius: 10px;
  transition: background 0.2s;
}

.song-card:hover {
  background: #252540;
}

.rank {
  width: 30px;
  text-align: center;
  font-weight: bold;
  color: #00d4ff;
  font-size: 1.1rem;
}

.cover {
  width: 60px;
  height: 60px;
  border-radius: 5px;
  object-fit: cover;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  font-weight: bold;
  color: #fff;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  color: #888;
}

.type {
  background: #444;
  padding: 2px 6px;
  border-radius: 3px;
}

.diff-label {
  background: #3a3a5a;
  padding: 2px 6px;
  border-radius: 3px;
  color: #aaa;
}

.diff-label.re-master {
  background: #4a1a4a;
  color: #ff69b4;
}

.fit-diff {
  color: #00d4ff;
}

.range-badge {
  background: #4a3a1a;
  color: #ffa500;
  padding: 2px 6px;
  border-radius: 3px;
}

.achievement {
  text-align: right;
  min-width: 100px;
}

.current {
  font-size: 1.1rem;
  font-weight: bold;
}

.gap {
  font-size: 0.8rem;
  color: #ff9800;
}

.rate {
  font-size: 0.85rem;
  font-weight: bold;
}

.no-record {
  color: #666;
  font-size: 0.9rem;
}
</style>
