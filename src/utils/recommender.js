// 推分推荐逻辑

import { getTierNames, makeChartKey } from './tierManager.js'

/**
 * 目标达成率档位
 */
export const TARGET_THRESHOLDS = [100.5, 100.7, 100.8, 100.9]

/**
 * 获取目标档位名称
 */
export function getTargetName(threshold) {
  if (threshold >= 100.9) return '100.9%'
  if (threshold >= 100.8) return '100.8%'
  if (threshold >= 100.7) return '100.7%'
  return '100.5%（鸟加）'
}

/**
 * 合并歌曲数据、拟合定数、用户成绩、民间分档
 * 支持 Master (index 3) 和 Re:Master (index 4) 难度
 */
export function mergeData(musicData, chartStats, playerRecords, tierData) {
  const result = []

  // 构建 song_id -> 拟合定数 的映射
  const fitDiffMap = {}
  if (chartStats?.charts) {
    for (const [songId, diffs] of Object.entries(chartStats.charts)) {
      fitDiffMap[songId] = {}
      diffs.forEach((diff, index) => {
        if (diff && diff.fit_diff !== undefined) {
          fitDiffMap[songId][index] = diff
        }
      })
    }
  }

  // 构建 song_id + level_index -> 用户成绩 的映射
  const recordMap = {}
  if (playerRecords?.records) {
    playerRecords.records.forEach(record => {
      const key = `${record.song_id}_${record.level_index}`
      recordMap[key] = record
    })
  }

  // 处理每首歌，检查 Master 和 Re:Master 难度
  musicData.forEach(song => {
    const songId = parseInt(song.id)

    // 检查 Master (index 3) 和 Re:Master (index 4)
    const difficulties = [
      { index: 3, label: 'Master' },
      { index: 4, label: 'Re:Master' }
    ]

    difficulties.forEach(({ index: diffIndex, label }) => {
      const ds = song.ds?.[diffIndex]
      const level = song.level?.[diffIndex]

      // 跳过没有这个难度的歌曲
      if (!ds || !level) return
      if (level !== '14' && level !== '14+') return

      const fitDiffData = fitDiffMap[songId]?.[diffIndex]
      const recordKey = `${songId}_${diffIndex}`
      const record = recordMap[recordKey]

      // 查找民间分档（使用 chartKey）
      let tierInfo = null
      const levelKey = level === '14+' ? '14+' : '14'
      const chartKey = makeChartKey(songId, diffIndex)

      for (const tier of getTierNames(levelKey)) {
        const items = tierData[levelKey]?.[tier]
        if (!items) continue

        if (tier === 'range') {
          // 范围档：检查对象数组
          const found = items.find(item => item.chartKey === chartKey)
          if (found) {
            tierInfo = { level: levelKey, tier, rangeMin: found.min, rangeMax: found.max }
            break
          }
        } else {
          // 固定档位：检查字符串数组
          if (items.includes(chartKey)) {
            tierInfo = { level: levelKey, tier }
            break
          }
        }
      }

      result.push({
        id: songId,
        title: song.title,
        type: song.type,
        ds: ds, // 官方定数
        level: level,
        diffIndex: diffIndex, // 难度索引
        diffLabel: label, // 难度标签
        fitDiff: fitDiffData?.fit_diff || null, // 拟合定数
        avgAchievement: fitDiffData?.avg || null, // 平均达成率
        record: record ? {
          achievements: record.achievements,
          dxScore: record.dxScore,
          fc: record.fc,
          fs: record.fs,
          rate: record.rate,
          ra: record.ra
        } : null,
        tier: tierInfo
      })
    })
  })

  return result
}

/**
 * 将档位名称转换为���值（用于排序）
 * 14级：'13+' -> -1, '0' -> 0, '1' -> 1, ..., '7' -> 7
 * 14+：'14' -> -1, '0' -> 0, '1' -> 1, ..., '7' -> 7
 */
function tierToValue(tierName, level) {
  if (tierName === '13+' || tierName === '14') return -1
  const num = parseInt(tierName)
  return isNaN(num) ? 99 : num
}

/**
 * 生成推分推荐
 * @param {Array} songs - 合并后的歌曲数据
 * @param {number} targetThreshold - 目标达成率 (100.7, 100.8, 100.9)
 * @returns {Object} 推荐结果
 */
export function generateRecommendations(songs, targetThreshold = 100.7) {
  const result = {
    '14': {},
    '14+': {}
  }

  // 按难度等级分组
  for (const levelKey of ['14', '14+']) {
    const levelSongs = songs.filter(s => s.level === levelKey)
    const tierNamesForLevel = getTierNames(levelKey)

    // 按民间分档分组
    for (const tier of tierNamesForLevel) {
      const tierSongs = levelSongs.filter(s => s.tier?.tier === tier)

      // 筛选未达目标的歌曲
      const untargeted = tierSongs.filter(s => {
        if (!s.record) return true // 没有成绩记录，需要推分
        return s.record.achievements < targetThreshold
      })

      // 排序逻辑
      if (tier === 'range') {
        // 范围档：先按 min 排序，再按拟合定数排序
        untargeted.sort((a, b) => {
          const aMinVal = tierToValue(a.tier?.rangeMin, levelKey)
          const bMinVal = tierToValue(b.tier?.rangeMin, levelKey)
          if (aMinVal !== bMinVal) return aMinVal - bMinVal
          const aDiff = a.fitDiff || a.ds || 99
          const bDiff = b.fitDiff || b.ds || 99
          return aDiff - bDiff
        })
      } else {
        // 固定档位：按拟合定数排序
        untargeted.sort((a, b) => {
          const aDiff = a.fitDiff || a.ds || 99
          const bDiff = b.fitDiff || b.ds || 99
          return aDiff - bDiff
        })
      }

      // 计算该档平均成绩
      const recordsWithScores = tierSongs.filter(s => s.record)
      const avgAchievement = recordsWithScores.length > 0
        ? recordsWithScores.reduce((sum, s) => sum + s.record.achievements, 0) / recordsWithScores.length
        : null

      result[levelKey][tier] = {
        total: tierSongs.length,
        completed: tierSongs.length - untargeted.length,
        avgAchievement: avgAchievement,
        recommendations: untargeted
      }
    }
  }

  return result
}

/**
 * 获取整体统计
 */
export function getOverallStats(songs, targetThreshold = 100.7) {
  let total = 0
  let completed = 0
  let totalAchievement = 0
  let hasRecord = 0

  songs.forEach(song => {
    total++
    if (song.record) {
      hasRecord++
      totalAchievement += song.record.achievements
      if (song.record.achievements >= targetThreshold) {
        completed++
      }
    }
  })

  return {
    total,
    completed,
    uncompleted: total - completed,
    progress: total > 0 ? (completed / total * 100).toFixed(1) : 0,
    avgAchievement: hasRecord > 0 ? (totalAchievement / hasRecord).toFixed(4) : null
  }
}

/**
 * 生成推鸟加推荐（按档位排序，不分组显示）
 * @param {Array} songs - 合并后的歌曲数据
 * @param {number} targetThreshold - 目标达成率（默认 100.5%）
 * @returns {Object} 推荐结果
 */
export function generateBirdPlusRecommendations(songs, targetThreshold = 100.5) {
  const result = {
    '14': [],
    '14+': []
  }

  for (const levelKey of ['14', '14+']) {
    const levelSongs = songs.filter(s => s.level === levelKey)

    // 筛选未达目标的歌曲
    const untargeted = levelSongs.filter(s => {
      if (!s.record) return true
      return s.record.achievements < targetThreshold
    })

    // 按档位排序，然后按拟合定数排序
    untargeted.sort((a, b) => {
      const aTierValue = tierToValue(a.tier?.tier, levelKey)
      const bTierValue = tierToValue(b.tier?.tier, levelKey)

      // 范围档按 min 排
      const aMinValue = a.tier?.tier === 'range'
        ? tierToValue(a.tier?.rangeMin, levelKey)
        : aTierValue
      const bMinValue = b.tier?.tier === 'range'
        ? tierToValue(b.tier?.rangeMin, levelKey)
        : bTierValue

      if (aMinValue !== bMinValue) return aMinValue - bMinValue

      // 同档位内按拟合定数排序
      const aDiff = a.fitDiff || a.ds || 99
      const bDiff = b.fitDiff || b.ds || 99
      return aDiff - bDiff
    })

    // 统计
    const total = levelSongs.length
    const completed = levelSongs.filter(s => s.record && s.record.achievements >= targetThreshold).length
    const recordsWithScores = levelSongs.filter(s => s.record)
    const avgAchievement = recordsWithScores.length > 0
      ? recordsWithScores.reduce((sum, s) => sum + s.record.achievements, 0) / recordsWithScores.length
      : null

    result[levelKey] = {
      total,
      completed,
      uncompleted: total - completed,
      progress: total > 0 ? (completed / total * 100).toFixed(1) : 0,
      avgAchievement: avgAchievement ? avgAchievement.toFixed(4) : null,
      recommendations: untargeted
    }
  }

  return result
}
