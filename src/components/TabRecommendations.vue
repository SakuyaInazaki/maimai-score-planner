<script setup>
import { computed } from 'vue'
import { getTierNames, getTierDisplayName } from '../utils/tierManager.js'
import { TARGET_THRESHOLDS, getTargetName } from '../utils/recommender.js'
import SongCard from './SongCard.vue'

const props = defineProps({
  recommendations: Object,
  birdPlusRecommendations: Object,
  overallStats: Object,
  targetThreshold: Number
})

const emit = defineEmits(['update:target'])

const levelOrder = ['14', '14+']

// 是否是推鸟加模式
const isBirdPlusMode = computed(() => props.targetThreshold === 100.5)

// 计算每个难度等级的统计（普通模式）
const levelStats = computed(() => {
  if (!props.recommendations) return {}
  const stats = {}
  for (const level of levelOrder) {
    const levelData = props.recommendations[level]
    const tierNamesForLevel = getTierNames(level)
    let total = 0
    let completed = 0

    for (const tier of tierNamesForLevel) {
      const tierData = levelData?.[tier]
      if (tierData) {
        total += tierData.total
        completed += tierData.completed
      }
    }

    stats[level] = {
      total,
      completed,
      progress: total > 0 ? (completed / total * 100).toFixed(1) : 0
    }
  }
  return stats
})

// 推鸟加模式的统计
const birdPlusStats = computed(() => {
  if (!props.birdPlusRecommendations) return {}
  const stats = {}
  for (const level of levelOrder) {
    const levelData = props.birdPlusRecommendations[level]
    if (levelData) {
      stats[level] = {
        total: levelData.total,
        completed: levelData.completed,
        progress: levelData.progress
      }
    }
  }
  return stats
})

function selectTarget(threshold) {
  emit('update:target', threshold)
}

// 获取指定等级的档位名称
function getTiersForLevel(level) {
  return getTierNames(level)
}

// 获取档位显示文本（用于推鸟加模式）
function getTierText(song, level) {
  if (!song.tier) return '未分档'
  if (song.tier.tier === 'range') {
    return `${song.tier.rangeMin}-${song.tier.rangeMax}档`
  }
  return getTierDisplayName(song.tier.tier, level)
}
</script>

<template>
  <div class="recommendations">
    <!-- 目标选择 -->
    <div class="target-selector card">
      <h2>目标达成率</h2>
      <div class="target-buttons">
        <button
          v-for="threshold in TARGET_THRESHOLDS"
          :key="threshold"
          :class="{ active: targetThreshold === threshold }"
          @click="selectTarget(threshold)"
        >
          {{ getTargetName(threshold) }}
        </button>
      </div>
    </div>

    <!-- 整体统计 -->
    <div class="overall-stats card" v-if="overallStats">
      <h2>整体进度</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{{ overallStats.total }}</span>
          <span class="stat-label">总曲目数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value completed">{{ overallStats.completed }}</span>
          <span class="stat-label">已达成目标</span>
        </div>
        <div class="stat-item">
          <span class="stat-value uncompleted">{{ overallStats.uncompleted }}</span>
          <span class="stat-label">待推分</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ overallStats.progress }}%</span>
          <span class="stat-label">完成进度</span>
        </div>
        <div class="stat-item" v-if="overallStats.avgAchievement">
          <span class="stat-value">{{ overallStats.avgAchievement }}%</span>
          <span class="stat-label">平均达成率</span>
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div class="no-data card" v-if="!recommendations">
      <p>请先登录获取成绩数据，或在「分档管理」中录入民间分档数据</p>
    </div>

    <!-- 推鸟加模式：按档位排序的平铺列表 -->
    <template v-if="isBirdPlusMode && birdPlusRecommendations">
      <div
        v-for="level in levelOrder"
        :key="level"
        class="level-section"
      >
        <div class="level-header">
          <h2>{{ level }} 推鸟加推荐</h2>
          <span class="level-progress" v-if="birdPlusStats[level]">
            {{ birdPlusStats[level].completed }}/{{ birdPlusStats[level].total }}
            ({{ birdPlusStats[level].progress }}%)
          </span>
        </div>

        <div class="bird-plus-list" v-if="birdPlusRecommendations[level]?.recommendations?.length > 0">
          <div class="list-info">
            共 {{ birdPlusRecommendations[level].recommendations.length }} 首未鸟加，按档位从低到高排列
          </div>
          <div class="song-list">
            <div
              v-for="(song, index) in birdPlusRecommendations[level].recommendations"
              :key="`${song.id}-${song.diffIndex}`"
              class="song-item-with-tier"
            >
              <span class="tier-badge">{{ getTierText(song, level) }}</span>
              <SongCard
                :song="song"
                :rank="index + 1"
                :target-threshold="100.5"
              />
            </div>
          </div>
        </div>
        <div class="tier-completed" v-else>
          全部已达成鸟加目标
        </div>
      </div>
    </template>

    <!-- 普通模式：按档位分组显示 -->
    <template v-if="!isBirdPlusMode && recommendations">
      <div
        v-for="level in levelOrder"
        :key="level"
        class="level-section"
      >
        <div class="level-header">
          <h2>{{ level }} 推分推荐</h2>
          <span class="level-progress" v-if="levelStats[level]">
            {{ levelStats[level].completed }}/{{ levelStats[level].total }}
            ({{ levelStats[level].progress }}%)
          </span>
        </div>

        <div
          v-for="tier in getTiersForLevel(level)"
          :key="tier"
          class="tier-section"
        >
          <template v-if="recommendations[level][tier] && recommendations[level][tier].total > 0">
            <div class="tier-header">
              <span class="tier-name">{{ getTierDisplayName(tier, level) }}</span>
              <span class="tier-stats">
                {{ recommendations[level][tier].completed }}/{{ recommendations[level][tier].total }}
                <span v-if="recommendations[level][tier].avgAchievement">
                  | 平均: {{ recommendations[level][tier].avgAchievement.toFixed(4) }}%
                </span>
              </span>
            </div>

            <!-- 已完成全部 -->
            <div
              v-if="recommendations[level][tier].recommendations.length === 0"
              class="tier-completed"
            >
              全部已达成目标
            </div>

            <!-- 推荐列表 -->
            <div class="song-list" v-else>
              <SongCard
                v-for="(song, index) in recommendations[level][tier].recommendations"
                :key="`${song.id}-${song.diffIndex}`"
                :song="song"
                :rank="index + 1"
                :target-threshold="targetThreshold"
              />
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.recommendations {
  padding-bottom: 50px;
}

.card {
  background: #252540;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  margin-bottom: 15px;
  color: #00d4ff;
  font-size: 1.1rem;
}

.target-selector {
  margin-bottom: 20px;
}

.target-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.target-buttons button {
  flex: 1;
  min-width: 120px;
  padding: 12px;
  background: #1a1a2e;
  border: 2px solid #444;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.target-buttons button:hover {
  border-color: #00d4ff;
}

.target-buttons button.active {
  background: #00d4ff;
  color: #000;
  border-color: #00d4ff;
}

.overall-stats {
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #fff;
}

.stat-value.completed {
  color: #4caf50;
}

.stat-value.uncompleted {
  color: #ff9800;
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  color: #888;
  margin-top: 5px;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #888;
}

.level-section {
  margin-bottom: 40px;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #444;
}

.level-header h2 {
  color: #fff;
  font-size: 1.3rem;
}

.level-progress {
  color: #00d4ff;
  font-size: 0.9rem;
}

.tier-section {
  margin-bottom: 25px;
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #1a1a2e;
  border-radius: 8px;
  margin-bottom: 15px;
}

.tier-name {
  font-weight: bold;
  color: #00d4ff;
}

.tier-stats {
  font-size: 0.85rem;
  color: #888;
}

.tier-completed {
  text-align: center;
  padding: 20px;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 8px;
}

.song-list {
  display: grid;
  gap: 10px;
}

/* 推鸟加模式样式 */
.bird-plus-list {
  background: #252540;
  border-radius: 10px;
  padding: 15px;
}

.list-info {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #444;
}

.song-item-with-tier {
  position: relative;
}

.tier-badge {
  display: inline-block;
  background: #3a3a5a;
  color: #00d4ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-bottom: 5px;
}
</style>
