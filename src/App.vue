<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const game = ref(null)
const actions = ref({})
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const autoPlaying = ref(false)
let autoTimer = null

const form = reactive({
  name: '',
  gender: '여성',
  appearance: '따뜻한 인상과 편안한 옷차림',
  mbti: 'ISFP',
  policy: 'balanced',
})

const policyLabels = {
  active: '적극적',
  balanced: '일반',
  calm: '소극적',
}

const statLabels = {
  talent: '재능',
  effort: '노력',
  charm: '매력',
  ability: '능력',
  experience: '경험',
  fame: '명성',
}

const needCards = computed(() => {
  if (!game.value) return []
  const needs = game.value.person.needs
  return [
    { key: 'hunger', label: '배고픔', value: needs.hunger, hint: '낮을수록 든든해요', color: '#df7d55' },
    { key: 'fatigue', label: '피로', value: needs.fatigue, hint: '잠과 휴식이 필요해요', color: '#6e7db8' },
    { key: 'stress', label: '스트레스', value: needs.stress, hint: '마음의 여유를 살펴요', color: '#b26882' },
    { key: 'loneliness', label: '외로움', value: needs.loneliness, hint: '사람을 만나면 줄어요', color: '#4e9078' },
  ]
})

const timeLabel = computed(() => {
  if (!game.value) return ''
  const hour = game.value.world.hour
  return `${hour < 12 ? '오전' : '오후'} ${hour <= 12 ? hour : hour - 12}시`
})

const avatarText = computed(() => game.value?.person.name?.slice(0, 1) || '피')

async function request(url, options = {}) {
  error.value = ''
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.')
  return data
}

async function loadGame() {
  try {
    const data = await request('/api/game')
    game.value = data.game
    actions.value = data.actions
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
}

async function createPerson() {
  if (!form.name.trim()) {
    error.value = '피플의 이름을 입력해 주세요.'
    return
  }
  busy.value = true
  try {
    const data = await request('/api/game', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    game.value = data.game
    actions.value = data.actions
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

async function doAction(action) {
  if (busy.value) return
  busy.value = true
  try {
    const data = await request('/api/game/action', {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    game.value = data.game
  } catch (requestError) {
    error.value = requestError.message
    stopAutoPlay()
  } finally {
    busy.value = false
  }
}

async function tick() {
  if (busy.value) return
  busy.value = true
  try {
    const data = await request('/api/game/tick', { method: 'POST' })
    game.value = data.game
  } catch (requestError) {
    error.value = requestError.message
    stopAutoPlay()
  } finally {
    busy.value = false
  }
}

async function advanceDay() {
  if (busy.value) return
  stopAutoPlay()
  busy.value = true
  try {
    const data = await request('/api/game/day', { method: 'POST' })
    game.value = data.game
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

function startAutoPlay() {
  autoPlaying.value = true
  tick()
  autoTimer = window.setInterval(tick, 5000)
}

function stopAutoPlay() {
  autoPlaying.value = false
  if (autoTimer) window.clearInterval(autoTimer)
  autoTimer = null
}

async function resetGame() {
  if (!window.confirm('현재 피플과 모든 행동 기록을 지울까요?')) return
  stopAutoPlay()
  busy.value = true
  try {
    await request('/api/game', { method: 'DELETE' })
    game.value = null
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    busy.value = false
  }
}

function formatLogTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(loadGame)
onBeforeUnmount(stopAutoPlay)
</script>

<template>
  <div v-if="loading" class="loading-screen">
    <div class="loading-mark">P</div>
    <p>피플의 하루를 준비하고 있어요</p>
  </div>

  <main v-else-if="!game" class="onboarding-shell">
    <section class="onboarding-story">
      <div class="brand brand--light">
        <span class="brand-mark">P</span>
        <span>PEOPLE</span>
      </div>
      <div class="story-copy">
        <p class="eyebrow">A SMALL LIFE SIMULATION</p>
        <h1>한 사람의<br />작은 삶이 시작됩니다.</h1>
        <p>
          일하고, 쉬고, 배우고, 누군가를 만나는 평범한 하루.<br />
          당신의 피플은 스스로 살아가며 매일 한 살씩 자랍니다.
        </p>
      </div>
      <div class="story-note">
        <span>현재 위치</span>
        <strong>피플 마을 · (0, 0)</strong>
      </div>
    </section>

    <section class="onboarding-form">
      <div class="form-wrap">
        <p class="step-label">처음 만나는 순간</p>
        <h2>당신의 피플을 소개해 주세요.</h2>
        <p class="form-description">지금 정한 모습에서 한 사람의 이야기가 천천히 자라납니다.</p>

        <form @submit.prevent="createPerson">
          <label>
            <span>이름</span>
            <input v-model="form.name" maxlength="20" placeholder="예: 여름" autocomplete="off" autofocus />
          </label>

          <div class="field-row">
            <label>
              <span>성별</span>
              <select v-model="form.gender">
                <option>여성</option>
                <option>남성</option>
                <option>논바이너리</option>
                <option>미정</option>
              </select>
            </label>
            <label>
              <span>MBTI</span>
              <select v-model="form.mbti">
                <option v-for="type in ['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ']" :key="type">
                  {{ type }}
                </option>
              </select>
            </label>
          </div>

          <label>
            <span>외형 한마디</span>
            <input v-model="form.appearance" maxlength="80" />
          </label>

          <fieldset>
            <legend>생활 방침</legend>
            <div class="policy-grid">
              <label :class="{ selected: form.policy === 'active' }">
                <input v-model="form.policy" type="radio" value="active" />
                <strong>적극적</strong>
                <small>일과 외부 활동을 즐겨요</small>
              </label>
              <label :class="{ selected: form.policy === 'balanced' }">
                <input v-model="form.policy" type="radio" value="balanced" />
                <strong>일반</strong>
                <small>상황에 맞게 균형을 잡아요</small>
              </label>
              <label :class="{ selected: form.policy === 'calm' }">
                <input v-model="form.policy" type="radio" value="calm" />
                <strong>소극적</strong>
                <small>휴식과 내면 활동을 즐겨요</small>
              </label>
            </div>
          </fieldset>

          <p v-if="error" class="error-message">{{ error }}</p>
          <button class="primary-button" :disabled="busy" type="submit">
            {{ busy ? '삶을 준비하는 중…' : '이 삶을 시작하기' }}
          </button>
        </form>
      </div>
    </section>
  </main>

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">P</span>
        <span>PEOPLE</span>
      </div>

      <nav class="main-nav" aria-label="주요 메뉴">
        <a class="active" href="#today"><span>⌂</span>오늘</a>
        <a href="#actions"><span>◇</span>행동</a>
        <a href="#record"><span>≡</span>기록</a>
      </nav>

      <div class="person-mini">
        <div class="avatar avatar--small">{{ avatarText }}</div>
        <div>
          <strong>{{ game.person.name }}</strong>
          <span>{{ game.person.age }}살 · {{ game.person.mbti }}</span>
        </div>
      </div>
    </aside>

    <section class="page">
      <header class="topbar">
        <div>
          <p>제 {{ game.world.day }}일</p>
          <strong>{{ timeLabel }}</strong>
        </div>
        <div class="topbar-actions">
          <div class="test-controls" aria-label="테스트 시간 조작">
            <span>TEST</span>
            <button :disabled="busy" @click="tick">1시간 지남</button>
            <button :disabled="busy" @click="advanceDay">하루 지남</button>
          </div>
          <span :class="['save-state', { active: !busy }]">
            <i></i>{{ busy ? '저장 중' : '자동 저장됨' }}
          </span>
          <button class="icon-button" title="게임 초기화" @click="resetGame">↻</button>
        </div>
      </header>

      <div class="content">
        <section id="today" class="hero-card">
          <div class="avatar">{{ avatarText }}</div>
          <div class="hero-copy">
            <span class="status-badge">{{ policyLabels[game.person.policy] }} 생활</span>
            <h1>{{ game.person.name }}의 {{ game.person.age }}번째 해</h1>
            <p>{{ game.person.appearance }} · {{ game.person.job }}</p>
          </div>
          <div class="hero-meta">
            <span>보유 금액</span>
            <strong>{{ game.person.money.toLocaleString() }}원</strong>
            <small>집 ({{ game.person.home.x }}, {{ game.person.home.y }})</small>
          </div>
        </section>

        <section class="section-block">
          <div class="section-heading">
            <div>
              <p class="eyebrow">CONDITION</p>
              <h2>오늘의 상태</h2>
            </div>
            <span>건강 {{ game.person.health }}</span>
          </div>
          <div class="condition-grid">
            <article v-for="need in needCards" :key="need.key" class="condition-card">
              <div>
                <span>{{ need.label }}</span>
                <strong>{{ need.value }}</strong>
              </div>
              <div class="progress-track"><i :style="{ width: `${need.value}%`, background: need.color }"></i></div>
              <small>{{ need.hint }}</small>
            </article>
          </div>
        </section>

        <div class="dashboard-grid">
          <section id="actions" class="panel actions-panel">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">NEXT MOVE</p>
                <h2>무엇을 할까요?</h2>
              </div>
              <button v-if="!autoPlaying" class="auto-button" @click="startAutoPlay">▶ 자동 생활</button>
              <button v-else class="auto-button active" @click="stopAutoPlay">Ⅱ 잠시 멈춤</button>
            </div>
            <p class="panel-help">자동 생활은 5초마다 게임 속 한 시간을 보내며 1~2개의 행동을 선택합니다.</p>
            <div class="action-grid">
              <button v-for="(action, key) in actions" :key="key" :disabled="busy" @click="doAction(key)">
                <span>{{ action.icon }}</span>
                <strong>{{ action.label }}</strong>
              </button>
            </div>
          </section>

          <section class="panel stats-panel">
            <div class="section-heading compact">
              <div>
                <p class="eyebrow">PERSONALITY</p>
                <h2>피플의 능력</h2>
              </div>
              <span class="mbti-chip">{{ game.person.mbti }}</span>
            </div>
            <dl>
              <div v-for="(value, key) in game.person.stats" :key="key">
                <dt>{{ statLabels[key] }}</dt>
                <dd>{{ value }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section id="record" class="panel log-panel">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">LIFE LOG</p>
              <h2>삶의 기록</h2>
            </div>
            <span>최근 {{ game.logs.length }}개</span>
          </div>
          <ol>
            <li v-for="log in game.logs" :key="log.id" :class="log.tone">
              <time>{{ formatLogTime(log.at) }}</time>
              <p>{{ log.message }}</p>
              <span v-if="log.roll" class="dice">D20 · {{ log.roll }}</span>
            </li>
          </ol>
        </section>
      </div>
    </section>
  </div>
</template>
