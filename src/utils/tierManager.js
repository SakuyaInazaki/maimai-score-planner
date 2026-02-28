// 民间分档数据管理

const TIER_STORAGE_KEY = 'maimai_tier_data'

// 14 级的分档结构
const tierStructure14 = {
  '13+': [],
  '0': [],
  '1': [],
  '2': [],
  '3': [],
  '4': [],
  '5': [],
  '6': [],
  '7': [],
  'range': [],
  'emoji': []
}

// 14+ 级的分档结构（最低档是 14 而不是 13+）
const tierStructure14Plus = {
  '14': [],
  '0': [],
  '1': [],
  '2': [],
  '3': [],
  '4': [],
  '5': [],
  '6': [],
  '7': [],
  'range': [],
  'emoji': []
}

// 默认分档结构
const defaultTierStructure = {
  '14': { ...tierStructure14 },
  '14+': { ...tierStructure14Plus }
}

/**
 * 生成谱面唯一标识符
 * @param {number} songId - 歌曲 ID
 * @param {number} diffIndex - 难度索引 (3 = Master, 4 = Re:Master)
 * @returns {string} 格式: "songId-diffIndex"
 */
export function makeChartKey(songId, diffIndex) {
  return `${songId}-${diffIndex}`
}

/**
 * 解析谱面唯一标识符
 * @returns {{songId: number, diffIndex: number}}
 */
export function parseChartKey(key) {
  const [songId, diffIndex] = key.split('-')
  return { songId: parseInt(songId), diffIndex: parseInt(diffIndex) }
}

/**
 * 获取指定等级的分档档位名称（按难度排序）
 * @param {string} level - '14' 或 '14+'
 */
export function getTierNames(level = '14') {
  if (level === '14+') {
    return ['14', '0', '1', '2', '3', '4', '5', '6', '7', 'range', 'emoji']
  }
  return ['13+', '0', '1', '2', '3', '4', '5', '6', '7', 'range', 'emoji']
}

/**
 * 获取所有可能的分档名称（用于兼容性）
 */
export function getAllTierNames() {
  return ['13+', '14', '0', '1', '2', '3', '4', '5', '6', '7', 'range', 'emoji']
}

/**
 * 获取分档显示名称
 */
export function getTierDisplayName(tierName, level = '14') {
  const displayNames14 = {
    '13+': '13+ (低于14)',
    '0': '0档 (最简)',
    '1': '1档',
    '2': '2档',
    '3': '3档',
    '4': '4档',
    '5': '5档',
    '6': '6档',
    '7': '7档 (最难)',
    'range': '范围档 (个人差)',
    'emoji': 'emoji (难以衡量)'
  }
  const displayNames14Plus = {
    '14': '14 (低于14+)',
    '0': '0档 (最简)',
    '1': '1档',
    '2': '2档',
    '3': '3档',
    '4': '4档',
    '5': '5档',
    '6': '6档',
    '7': '7档 (最难)',
    'range': '范围档 (个人差)',
    'emoji': 'emoji (难以衡量)'
  }
  return level === '14+' ? (displayNames14Plus[tierName] || tierName) : (displayNames14[tierName] || tierName)
}

/**
 * 从 localStorage 加载分档数据，如果没有则加载内置数据
 */
export function loadTierData() {
  const stored = localStorage.getItem(TIER_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('加载分档数据失败:', e)
    }
  }
  return JSON.parse(JSON.stringify(defaultTierStructure))
}

/**
 * 从内置 JSON 文件加载默认分档数据
 */
export async function loadDefaultTierData() {
  try {
    const response = await fetch('/tier-data.json')
    if (response.ok) {
      const data = await response.json()
      if (data.tiers) {
        return migrateLegacyData(data.tiers)
      }
      return data
    }
  } catch (e) {
    console.error('加载内置分档数据失败:', e)
  }
  return JSON.parse(JSON.stringify(defaultTierStructure))
}

/**
 * 保存分档数据到 localStorage
 */
export function saveTierData(data) {
  localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(data))
}

/**
 * 导出分档数据为 JSON 文件
 */
export function exportTierData(data) {
  const exportData = {
    version: '1.45',
    exportDate: new Date().toISOString().split('T')[0],
    tiers: data
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `maimai-tier-list-${exportData.exportDate}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导入分档数据（自动迁移旧格式）
 */
export function importTierData(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    let tiers = null

    if (data.tiers) {
      tiers = data.tiers
    } else if (data['14'] || data['14+']) {
      tiers = data
    } else {
      throw new Error('无效的分档数据格式')
    }

    // 检测并迁移旧格式（纯数字 -> "songId-3"）
    const migrated = migrateLegacyData(tiers)
    return migrated
  } catch (e) {
    console.error('导入分档数据失败:', e)
    throw e
  }
}

/**
 * 迁移旧格式数据
 * 旧格式：数组元素是纯数字（songId）或字符串 "songId-diffIndex"
 * 新格式：固定档位是字符串，范围档是对象 { chartKey, min, max }（min/max 是档位名称字符串）
 */
function migrateLegacyData(tiers) {
  const migrated = {
    '14': {},
    '14+': {}
  }

  for (const level of ['14', '14+']) {
    const tierNames = getTierNames(level)
    for (const tier of tierNames) {
      const items = tiers[level]?.[tier] || []

      if (tier === 'range') {
        // 范围档：转换为新格式
        migrated[level][tier] = items.map(item => {
          if (typeof item === 'object' && item.chartKey) {
            // 已经是新格式，确保 min/max 是字符串
            return {
              chartKey: item.chartKey,
              min: String(item.min),
              max: String(item.max)
            }
          }
          // 旧格式：转换为对象，默认范围待设置
          const chartKey = typeof item === 'string' && item.includes('-')
            ? item
            : makeChartKey(Number(item), 3)
          return { chartKey, min: '0', max: '0' }
        })
      } else {
        // 固定档位：保持字符串格式
        migrated[level][tier] = items.map(item => {
          if (typeof item === 'string' && item.includes('-')) {
            return item
          }
          return makeChartKey(Number(item), 3)
        })
      }
    }
  }

  return migrated
}

/**
 * 获取谱面的分档信息
 * @param {number} songId - 歌曲 ID
 * @param {number} diffIndex - 难度索引 (3 = Master, 4 = Re:Master)
 * @param {object} tierData - 分档数据
 * @returns {{level: string, tier: string, rangeMin?: number, rangeMax?: number} | null}
 */
export function getChartTier(songId, diffIndex, tierData) {
  const chartKey = makeChartKey(songId, diffIndex)
  for (const level of ['14', '14+']) {
    for (const tier of getTierNames(level)) {
      const items = tierData[level]?.[tier]
      if (!items) continue

      if (tier === 'range') {
        // 范围档：检查对象数组
        const found = items.find(item => item.chartKey === chartKey)
        if (found) {
          return { level, tier, rangeMin: found.min, rangeMax: found.max }
        }
      } else {
        // 固定档位：检查字符串数组
        if (items.includes(chartKey)) {
          return { level, tier }
        }
      }
    }
  }
  return null
}

/**
 * 设置谱面的分档
 * @param {number} songId - 歌曲 ID
 * @param {number} diffIndex - 难度索引
 * @param {string} level - 难度等级 ('14' 或 '14+')
 * @param {string} tier - 档位
 * @param {object} tierData - 分档数据
 * @param {object} rangeInfo - 范围档信息 { min, max }（仅范围档需要）
 */
export function setChartTier(songId, diffIndex, level, tier, tierData, rangeInfo = null) {
  const chartKey = makeChartKey(songId, diffIndex)

  // 先从所有档位中移除
  for (const l of ['14', '14+']) {
    for (const t of getTierNames(l)) {
      if (!tierData[l]?.[t]) continue

      if (t === 'range') {
        // 范围档：从对象数组中移除
        const index = tierData[l][t].findIndex(item => item.chartKey === chartKey)
        if (index > -1) {
          tierData[l][t].splice(index, 1)
        }
      } else {
        // 固定档位：从字符串数组中移除
        const index = tierData[l][t].indexOf(chartKey)
        if (index > -1) {
          tierData[l][t].splice(index, 1)
        }
      }
    }
  }

  // 添加到新档位
  if (level && tier && tierData[level]?.[tier] !== undefined) {
    if (tier === 'range') {
      // 范围档：添加对象
      if (rangeInfo && rangeInfo.min !== undefined && rangeInfo.max !== undefined) {
        tierData[level][tier].push({
          chartKey,
          min: String(rangeInfo.min),
          max: String(rangeInfo.max)
        })
      }
    } else {
      // 固定档位：添加字符串
      if (!tierData[level][tier].includes(chartKey)) {
        tierData[level][tier].push(chartKey)
      }
    }
  }
  return tierData
}

/**
 * 获取档位内的谱面数量统计
 */
export function getTierStats(tierData) {
  const stats = { '14': {}, '14+': {} }
  for (const level of ['14', '14+']) {
    for (const tier of getTierNames(level)) {
      stats[level][tier] = tierData[level]?.[tier]?.length || 0
    }
  }
  return stats
}
