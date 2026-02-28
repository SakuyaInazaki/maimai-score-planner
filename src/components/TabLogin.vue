<script setup>
import { ref } from 'vue'

const props = defineProps({
  username: String,
  token: String
})

const emit = defineEmits(['login'])

const localUsername = ref(props.username || '')
const localToken = ref(props.token || '')

function handleSubmit() {
  if (!localToken.value.trim()) {
    alert('请输入 Import-Token')
    return
  }
  emit('login', {
    username: localUsername.value.trim() || '用户',
    token: localToken.value.trim()
  })
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h2>登录 Diving-Fish</h2>
      <p class="description">
        请输入你的 Diving-Fish Import-Token 以获取成绩数据
      </p>

      <div class="form-group">
        <label>用户名（可选）</label>
        <input
          v-model="localUsername"
          type="text"
          placeholder="用于显示，可任意填写"
        />
      </div>

      <div class="form-group">
        <label>Import-Token</label>
        <input
          v-model="localToken"
          type="password"
          placeholder="从 diving-fish 网站获取"
        />
        <p class="hint">
          获取方式：登录
          <a href="https://maimai.diving-fish.com/maimaidx/prober/" target="_blank">
            Diving-Fish
          </a>
          → 编辑个人资料 → 生成 Import-Token
        </p>
      </div>

      <button class="submit-btn" @click="handleSubmit">
        获取成绩数据
      </button>

      <div class="info-card">
        <h3>关于 Import-Token</h3>
        <ul>
          <li>Token 用于获取你的完整成绩数据</li>
          <li>Token 只在当前浏览器会话中使用，不会上传到服务器</li>
          <li>如果 Token 失效，请重新在 Diving-Fish 网站生成</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  padding: 50px 20px;
}

.login-card {
  background: #252540;
  border-radius: 15px;
  padding: 40px;
  width: 100%;
  max-width: 500px;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 10px;
  color: #00d4ff;
}

.description {
  text-align: center;
  color: #888;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #aaa;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  background: #1a1a2e;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #00d4ff;
}

.hint {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #666;
}

.hint a {
  color: #00d4ff;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 212, 255, 0.3);
}

.info-card {
  margin-top: 30px;
  padding: 20px;
  background: #1a1a2e;
  border-radius: 10px;
}

.info-card h3 {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 10px;
}

.info-card ul {
  list-style: none;
  padding: 0;
}

.info-card li {
  font-size: 0.85rem;
  color: #666;
  padding: 5px 0;
  padding-left: 15px;
  position: relative;
}

.info-card li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #00d4ff;
}
</style>
