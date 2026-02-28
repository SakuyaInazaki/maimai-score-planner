<script setup>
import { ref, computed } from 'vue'
import { getTierNames, getTierDisplayName, getTierStats, makeChartKey } from '../utils/tierManager.js'
import { getCoverUrl } from '../api/divingFish.js'

const props = defineProps({
  musicData: Array,
  tierData: Object,
  playerRecords: Object
})

const emit = defineEmits(['updateTier', 'export', 'import'])

// 筛选条件
const filterLevel = ref('14') // 14 或 14+
const filterTier = ref('') // 空表示未分档
const searchQuery = ref('')

// 范围档弹窗
const showRangeModal = ref(false)
const rangeModalSong = ref(null)
const rangeMin = ref('0')
const rangeMax = ref('0')

// 获取当前等级的档位名称（用于范围档选择）
const currentTierNames = computed(() => getTierNames(filterLevel.value))

// 获取用于范围选择的档位名称（排除 range 和 emoji）
const tierOptionsForRange = computed(() => {
  const names = getTierNames(filterLevel.value)
  return names.filter(t => t !== 'range' && t !== 'emoji')
})

// 获取 14/14+ 难度的歌曲列表（包括 Master 和 Re:Master）
const levelSongs = computed(() => {
  if (!props.musicData?.length) return []

  const result = []

  props.musicData.forEach(song => {
    const songId = parseInt(song.id)

    // 检查 Master (index 3)
    const masterLevel = song.level?.[3]
    if (masterLevel === '14' || masterLevel === '14+') {
      result.push({
        id: songId,
        title: song.title,
        type: song.type,
        ds: song.ds?.[3] || 0,
        level: masterLevel,
        diffIndex: 3,
        diffLabel: 'Master',
        basicInfo: song.basic_info
      })
    }

    // 检查 Re:Master (index 4)
    const reMasterLevel = song.level?.[4]
    if (reMasterLevel === '14' || reMasterLevel === '14+') {
      result.push({
        id: songId,
        title: song.title,
        type: song.type,
        ds: song.ds?.[4] || 0,
        level: reMasterLevel,
        diffIndex: 4,
        diffLabel: 'Re:Master',
        basicInfo: song.basic_info
      })
    }
  })

  return result
})

// 根据 filterLevel 筛选歌曲
const filteredSongs = computed(() => {
  let songs = levelSongs.value.filter(s => s.level === filterLevel.value)

  // 按分档筛选
  const tierNamesForLevel = getTierNames(filterLevel.value)
  if (filterTier.value === 'unassigned') {
    // 未分档
    const assignedKeys = new Set()
    for (const tier of tierNamesForLevel) {
      const items = props.tierData[filterLevel.value]?.[tier] || []
      if (tier === 'range') {
        items.forEach(item => assignedKeys.add(item.chartKey))
      } else {
        items.forEach(key => assignedKeys.add(key))
      }
    }
    songs = songs.filter(s => !assignedKeys.has(makeChartKey(s.id, s.diffIndex)))
  } else if (filterTier.value) {
    // 指定档位
    const items = props.tierData[filterLevel.value]?.[filterTier.value] || []
    if (filterTier.value === 'range') {
      const tierKeys = new Set(items.map(item => item.chartKey))
      songs = songs.filter(s => tierKeys.has(makeChartKey(s.id, s.diffIndex)))
    } else {
      const tierKeys = new Set(items)
      songs = songs.filter(s => tierKeys.has(makeChartKey(s.id, s.diffIndex)))
    }
  }

  // 按曲名搜索
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    songs = songs.filter(s => s.title.toLowerCase().includes(query))
  }

  // 按定数排序
  songs.sort((a, b) => a.ds - b.ds)

  return songs
})

// 分档统计
const tierStats = computed(() => {
  return getTierStats(props.tierData)
})

// 获取谱面当前分档信息
function getChartCurrentTierInfo(songId, diffIndex) {
  const chartKey = makeChartKey(songId, diffIndex)
  const tierNamesForLevel = getTierNames(filterLevel.value)

  for (const tier of tierNamesForLevel) {
    const items = props.tierData[filterLevel.value]?.[tier]
    if (!items) continue

    if (tier === 'range') {
      const found = items.find(item => item.chartKey === chartKey)
      if (found) {
        return { tier, rangeMin: found.min, rangeMax: found.max }
      }
    } else {
      if (items.includes(chartKey)) {
        return { tier }
      }
    }
  }
  return null
}

// 获取谱面当前分档显示文本
function getChartCurrentTierText(songId, diffIndex) {
  const info = getChartCurrentTierInfo(songId, diffIndex)
  if (!info) return '未分档'

  if (info.tier === 'range') {
    return `${info.rangeMin}-${info.rangeMax}档`
  }
  return getTierDisplayName(info.tier, filterLevel.value)
}

// 设置谱面分档
function setTier(songId, diffIndex, tier) {
  if (tier === 'range') {
    // 打开范围档弹窗
    const info = getChartCurrentTierInfo(songId, diffIndex)
    rangeModalSong.value = { id: songId, diffIndex }
    rangeMin.value = info?.rangeMin || '0'
    rangeMax.value = info?.rangeMax || '0'
    showRangeModal.value = true
  } else {
    emit('updateTier', songId, diffIndex, filterLevel.value, tier, null)
  }
}

// 确认范围档
function confirmRange() {
  if (rangeModalSong.value) {
    emit('updateTier',
      rangeModalSong.value.id,
      rangeModalSong.value.diffIndex,
      filterLevel.value,
      'range',
      { min: rangeMin.value, max: rangeMax.value }
    )
  }
  showRangeModal.value = false
  rangeModalSong.value = null
}

// 取消范围档弹窗
function cancelRange() {
  showRangeModal.value = false
  rangeModalSong.value = null
}

// 导出
function handleExport() {
  emit('export')
}

// 导入
function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      emit('import', e.target.result)
      alert('导入成功')
    } catch (err) {
      alert('导入失败: ' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}
</script>

<template>
  <div class="tier-manager">
    <!-- 范围档弹窗 -->
    <div class="modal-overlay" v-if="showRangeModal" @click.self="cancelRange">
      <div class="modal">
        <h3>设置范围档</h3>
        <p>请选择该曲目的难度范围</p>
        <div class="range-inputs">
          <select v-model="rangeMin">
            <option v-for="tier in tierOptionsForRange" :key="tier" :value="tier">
              {{ getTierDisplayName(tier, filterLevel) }}
            </option>
          </select>
          <span>-</span>
          <select v-model="rangeMax">
            <option v-for="tier in tierOptionsForRange" :key="tier" :value="tier">
              {{ getTierDisplayName(tier, filterLevel) }}
            </option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="cancel" @click="cancelRange">取消</button>
          <button class="confirm" @click="confirmRange">确认</button>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar card">
      <h2>分档数据管理</h2>
      <div class="actions">
        <button @click="handleExport">导出 JSON</button>
        <label class="import-btn">
          导入 JSON
          <input type="file" accept=".json" @change="handleImport" hidden />
        </label>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats card">
      <h3>{{ filterLevel }} 分档统计</h3>
      <div class="stats-grid">
        <div v-for="tier in currentTierNames" :key="tier" class="stat-row">
          <span class="tier-label">{{ getTierDisplayName(tier, filterLevel) }}</span>
          <span class="tier-count">{{ tierStats[filterLevel]?.[tier] || 0 }} 首</span>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters card">
      <div class="filter-row">
        <div class="filter-group">
          <label>难度等级</label>
          <select v-model="filterLevel">
            <option value="14">14</option>
            <option value="14+">14+</option>
          </select>
        </div>

        <div class="filter-group">
          <label>分档筛选</label>
          <select v-model="filterTier">
            <option value="">全部</option>
            <option value="unassigned">未分档</option>
            <option v-for="tier in currentTierNames" :key="tier" :value="tier">
              {{ getTierDisplayName(tier, filterLevel) }}
            </option>
          </select>
        </div>

        <div class="filter-group search">
          <label>搜索曲名</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="输入曲名..."
          />
        </div>
      </div>
    </div>

    <!-- 歌曲列表 -->
    <div class="song-manager">
      <div class="list-header">
        <span>共 {{ filteredSongs.length }} 首歌曲</span>
      </div>

      <div class="song-table">
        <div class="table-header">
          <span class="col-cover"></span>
          <span class="col-title">曲名</span>
          <span class="col-diff">难度</span>
          <span class="col-ds">定数</span>
          <span class="col-tier">当前分档</span>
          <span class="col-actions">设置分档</span>
        </div>

        <div class="table-body">
          <div
            v-for="song in filteredSongs"
            :key="`${song.id}-${song.diffIndex}`"
            class="table-row"
          >
            <span class="col-cover">
              <img :src="getCoverUrl(song.id)" :alt="song.title" />
            </span>
            <span class="col-title">{{ song.title }}</span>
            <span class="col-diff" :class="{ 're-master': song.diffLabel === 'Re:Master' }">
              {{ song.diffLabel }}
            </span>
            <span class="col-ds">{{ song.ds }}</span>
            <span class="col-tier" :class="{ 'is-range': getChartCurrentTierInfo(song.id, song.diffIndex)?.tier === 'range' }">
              {{ getChartCurrentTierText(song.id, song.diffIndex) }}
            </span>
            <span class="col-actions">
              <select
                :value="getChartCurrentTierInfo(song.id, song.diffIndex)?.tier || ''"
                @change="setTier(song.id, song.diffIndex, $event.target.value)"
              >
                <option value="">清除</option>
                <option v-for="tier in currentTierNames" :key="tier" :value="tier">
                  {{ getTierDisplayName(tier, filterLevel) }}
                </option>
              </select>
            </span>
          </div>
        </div>
      </div>

      <div class="empty" v-if="filteredSongs.length === 0">
        没有找到符合条件的歌曲
      </div>
    </div>
  </div>
</template>

<style scoped>
.tier-manager {
  padding-bottom: 50px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #252540;
  border-radius: 10px;
  padding: 25px;
  min-width: 300px;
}

.modal h3 {
  color: #00d4ff;
  margin-bottom: 10px;
}

.modal p {
  color: #888;
  margin-bottom: 15px;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.range-inputs input {
  width: 60px;
  padding: 10px;
  background: #1a1a2e;
  border: 1px solid #444;
  color: #fff;
  border-radius: 5px;
  text-align: center;
}

.range-inputs span {
  color: #888;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 8px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.modal-actions .cancel {
  background: #444;
  border: none;
  color: #fff;
}

.modal-actions .confirm {
  background: #00d4ff;
  border: none;
  color: #000;
  font-weight: bold;
}

.card {
  background: #252540;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  color: #00d4ff;
  margin-bottom: 15px;
}

.card h3 {
  color: #00d4ff;
  margin-bottom: 15px;
  font-size: 1rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar h2 {
  margin-bottom: 0;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button,
.import-btn {
  padding: 10px 20px;
  background: #00d4ff;
  color: #000;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #1a1a2e;
  border-radius: 5px;
}

.tier-label {
  color: #aaa;
}

.tier-count {
  color: #00d4ff;
  font-weight: bold;
}

.filter-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 0.85rem;
  color: #888;
}

.filter-group select,
.filter-group input {
  padding: 10px;
  background: #1a1a2e;
  border: 1px solid #444;
  color: #fff;
  border-radius: 5px;
  min-width: 150px;
}

.filter-group.search {
  flex: 1;
}

.filter-group.search input {
  width: 100%;
}

.list-header {
  margin-bottom: 15px;
  color: #888;
}

.song-table {
  background: #252540;
  border-radius: 10px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 1fr 80px 60px 120px 150px;
  padding: 15px;
  background: #1a1a2e;
  font-weight: bold;
  color: #888;
  font-size: 0.85rem;
}

.table-body {
  max-height: 600px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 60px 1fr 80px 60px 120px 150px;
  padding: 10px 15px;
  align-items: center;
  border-bottom: 1px solid #333;
}

.table-row:hover {
  background: rgba(0, 212, 255, 0.05);
}

.col-cover img {
  width: 50px;
  height: 50px;
  border-radius: 5px;
  object-fit: cover;
}

.col-title {
  padding: 0 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-diff {
  text-align: center;
  font-size: 0.8rem;
  color: #aaa;
}

.col-diff.re-master {
  color: #ff69b4;
}

.col-ds {
  text-align: center;
  color: #00d4ff;
}

.col-tier {
  font-size: 0.85rem;
  color: #888;
}

.col-tier.is-range {
  color: #ffa500;
}

.col-actions select {
  padding: 8px;
  background: #1a1a2e;
  border: 1px solid #444;
  color: #fff;
  border-radius: 5px;
  width: 100%;
}

.empty {
  text-align: center;
  padding: 50px;
  color: #666;
  background: #252540;
  border-radius: 10px;
}
</style>
