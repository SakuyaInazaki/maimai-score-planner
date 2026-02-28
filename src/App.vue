<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getMusicData,
  getChartStats,
  getPlayerRecords
} from './api/divingFish.js'
import {
  loadTierData,
  saveTierData,
  exportTierData,
  importTierData,
  setChartTier
} from './utils/tierManager.js'
import {
  mergeData,
  generateRecommendations,
  generateBirdPlusRecommendations,
  getOverallStats,
  TARGET_THRESHOLDS,
  getTargetName
} from './utils/recommender.js'
import TabLogin from './components/TabLogin.vue'
import TabRecommendations from './components/TabRecommendations.vue'
import TabTierManager from './components/TabTierManager.vue'

// 状态
const currentTab = ref('login')
const isLoading = ref(false)
const error = ref(null)

// 数据
const musicData = ref([])
const chartStats = ref(null)
const playerRecords = ref(null)
const tierData = ref({})

// 用户信息
const username = ref('')
const importToken = ref('')

// 目标达成率
const targetThreshold = ref(100.7)

// 计算属性：合并后的歌曲数据
const mergedSongs = computed(() => {
  if (!musicData.value.length) return []
  return mergeData(musicData.value, chartStats.value, playerRecords.value, tierData.value)
})

// 计算属性：推荐结果
const recommendations = computed(() => {
  if (!mergedSongs.value.length) return null
  return generateRecommendations(mergedSongs.value, targetThreshold.value)
})

// 计算属性：推鸟加推荐结果
const birdPlusRecommendations = computed(() => {
  if (!mergedSongs.value.length) return null
  return generateBirdPlusRecommendations(mergedSongs.value, 100.5)
})

// 计算属性：整体统计
const overallStats = computed(() => {
  if (!mergedSongs.value.length) return null
  return getOverallStats(mergedSongs.value, targetThreshold.value)
})

// 初始化
onMounted(async () => {
  tierData.value = loadTierData()
  await loadBaseData()
})

// 加载基础数据（歌曲元数据和拟合定数）
async function loadBaseData() {
  isLoading.value = true
  error.value = null
  try {
    const [music, stats] = await Promise.all([
      getMusicData(),
      getChartStats()
    ])
    musicData.value = music
    chartStats.value = stats
  } catch (e) {
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

// 登录获取用户成绩
async function handleLogin({ username: user, token }) {
  isLoading.value = true
  error.value = null
  try {
    username.value = user
    importToken.value = token

    const records = await getPlayerRecords(token)
    playerRecords.value = records
    currentTab.value = 'recommendations'
  } catch (e) {
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

// 更新谱面分档
function handleUpdateTier(songId, diffIndex, level, tier, rangeInfo) {
  tierData.value = setChartTier(songId, diffIndex, level, tier, { ...tierData.value }, rangeInfo)
  saveTierData(tierData.value)
}

// 导出分档数据
function handleExportTier() {
  exportTierData(tierData.value)
}

// 导入分档数据
function handleImportTier(jsonString) {
  try {
    tierData.value = importTierData(jsonString)
    saveTierData(tierData.value)
  } catch (e) {
    error.value = e.message
  }
}

// 切换目标达成率
function handleTargetChange(threshold) {
  targetThreshold.value = threshold
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>舞萌DX 推分规划工具</h1>
      <div class="nav">
        <button
          :class="{ active: currentTab === 'login' }"
          @click="currentTab = 'login'"
        >
          登录
        </button>
        <button
          :class="{ active: currentTab === 'recommendations' }"
          @click="currentTab = 'recommendations'"
          :disabled="!playerRecords"
        >
          推分推荐
        </button>
        <button
          :class="{ active: currentTab === 'tierManager' }"
          @click="currentTab = 'tierManager'"
        >
          分档管理
        </button>
      </div>
      <div class="user-info" v-if="username">
        用户: {{ username }}
      </div>
    </header>

    <div class="error" v-if="error">
      {{ error }}
      <button @click="error = null">关闭</button>
    </div>

    <div class="loading" v-if="isLoading">
      加载中...
    </div>

    <main class="main">
      <TabLogin
        v-if="currentTab === 'login'"
        :username="username"
        :token="importToken"
        @login="handleLogin"
      />

      <TabRecommendations
        v-else-if="currentTab === 'recommendations'"
        :recommendations="recommendations"
        :bird-plus-recommendations="birdPlusRecommendations"
        :overall-stats="overallStats"
        :target-threshold="targetThreshold"
        @update:target="handleTargetChange"
      />

      <TabTierManager
        v-else-if="currentTab === 'tierManager'"
        :music-data="musicData"
        :tier-data="tierData"
        :player-records="playerRecords"
        @update-tier="handleUpdateTier"
        @export="handleExportTier"
        @import="handleImportTier"
      />
    </main>

    <footer class="footer">
      <p>数据来源: <a href="https://maimai.diving-fish.com" target="_blank">Diving-Fish 查分器</a></p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #1a1a2e;
  color: #eee;
  min-height: 100vh;
}

.app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #333;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header h1 {
  font-size: 1.5rem;
  color: #00d4ff;
}

.nav {
  display: flex;
  gap: 10px;
}

.nav button {
  padding: 10px 20px;
  background: #333;
  border: 1px solid #444;
  color: #fff;
  cursor: pointer;
  border-radius: 5px;
  transition: all 0.3s;
}

.nav button:hover:not(:disabled) {
  background: #444;
}

.nav button.active {
  background: #00d4ff;
  color: #000;
}

.nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-info {
  color: #888;
  font-size: 0.9rem;
}

.error {
  background: #ff4444;
  color: white;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error button {
  background: transparent;
  border: 1px solid white;
  color: white;
  padding: 5px 10px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 50px;
  color: #888;
}

.main {
  min-height: 60vh;
}

.footer {
  text-align: center;
  padding: 30px 0;
  margin-top: 40px;
  border-top: 1px solid #333;
  color: #666;
}

.footer a {
  color: #00d4ff;
}

/* 通用组件样式 */
.card {
  background: #252540;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  margin-bottom: 15px;
  color: #00d4ff;
  font-size: 1.2rem;
}

button {
  font-family: inherit;
}

input, select {
  font-family: inherit;
}
</style>
