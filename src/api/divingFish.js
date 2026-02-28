// Diving-Fish API 封装

const BASE_URL = 'https://www.diving-fish.com/api/maimaidxprober'

/**
 * 获取所有歌曲元数据
 */
export async function getMusicData() {
  const response = await fetch(`${BASE_URL}/music_data`)
  if (!response.ok) {
    throw new Error(`获取歌曲数据失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 获取谱面统计数据（包含拟合定数）
 */
export async function getChartStats() {
  const response = await fetch(`${BASE_URL}/chart_stats`)
  if (!response.ok) {
    throw new Error(`获取谱面统计失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 获取用户 B50 数据（无需验证）
 * @param {string} username - 用户名
 */
export async function getPlayerB50(username) {
  const response = await fetch(`${BASE_URL}/query/player`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, b50: '1' })
  })
  if (!response.ok) {
    throw new Error(`获取用户数据失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 获取用户完整成绩（需要 Import-Token）
 * @param {string} token - Import-Token
 */
export async function getPlayerRecords(token) {
  const response = await fetch(`${BASE_URL}/player/records`, {
    method: 'GET',
    headers: {
      'Import-Token': token
    }
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token 无效或已过期')
    }
    throw new Error(`获取完整成绩失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 获取歌曲封面 URL
 * @param {number} id - 歌曲 ID
 */
export function getCoverUrl(id) {
  const paddedId = String(id).padStart(5, '0')
  return `https://www.diving-fish.com/covers/${paddedId}.png`
}
