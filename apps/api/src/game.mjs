import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const SAVE_DIR = join(ROOT_DIR, 'data', 'saves')
const SAVE_PATH = process.env.SAVE_FILE_PATH
  ? resolve(process.env.SAVE_FILE_PATH)
  : join(SAVE_DIR, 'local-player.json')
const MIN_STAT = 1
const MAX_STAT = 20
const MAX_LOGS = 100

const ACTIONS = {
  eat: { label: '식사하기', icon: '🍚' },
  sleep: { label: '잠자기', icon: '🌙' },
  work: { label: '일하기', icon: '💼' },
  rest: { label: '쉬기', icon: '☕' },
  study: { label: '공부하기', icon: '📚' },
  meet: { label: '사람 만나기', icon: '👋' },
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))
const randomStat = () => Math.floor(Math.random() * 4) + 4
const rollD20 = () => Math.floor(Math.random() * 20) + 1

function makeLog(message, tone = 'neutral', roll = null) {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    message,
    tone,
    roll,
  }
}

function addLog(game, log) {
  game.logs.unshift(log)
  game.logs = game.logs.slice(0, MAX_LOGS)
}

function changeNeeds(person, changes) {
  for (const [key, amount] of Object.entries(changes)) {
    person.needs[key] = clamp(person.needs[key] + amount)
  }
}

function actionRoll(person, difficulty = 12) {
  const roll = rollD20()
  const total = roll + Math.floor(person.stats.ability / 2)
  return {
    roll,
    total,
    success: roll === 20 || (roll !== 1 && total >= difficulty),
    critical: roll === 1 ? 'failure' : roll === 20 ? 'success' : null,
  }
}

function performAction(game, actionType) {
  const person = game.person
  const action = ACTIONS[actionType]
  if (!action) throw new Error('알 수 없는 행동입니다.')

  changeNeeds(person, { hunger: 4, fatigue: 3, stress: 1, loneliness: 1 })
  const result = actionRoll(person)
  let message = ''
  let tone = result.success ? 'positive' : 'warning'

  switch (actionType) {
    case 'eat':
      if (person.money < 8) {
        message = `${person.name}은(는) 돈이 부족해 간단한 물로 배를 달랬다.`
        changeNeeds(person, { hunger: -6, stress: 4 })
        tone = 'warning'
      } else {
        person.money -= 8
        changeNeeds(person, { hunger: result.success ? -38 : -24, stress: -3 })
        message = result.success
          ? `${person.name}은(는) 든든한 한 끼를 맛있게 먹었다.`
          : `${person.name}은(는) 급하게 식사를 마쳤다.`
      }
      break
    case 'sleep':
      changeNeeds(person, { fatigue: result.success ? -46 : -30, stress: -10, hunger: 5 })
      message = result.success
        ? `${person.name}은(는) 깊이 잠들어 피로를 풀었다.`
        : `${person.name}은(는) 뒤척이다가 겨우 잠들었다.`
      break
    case 'work': {
      const pay = result.success ? 24 : 10
      person.money += pay
      person.stats.experience = clamp(person.stats.experience + (result.success ? 2 : 1), 0, 9999)
      changeNeeds(person, { fatigue: 11, stress: result.success ? 7 : 13, hunger: 5 })
      message = result.success
        ? `${person.name}은(는) 일을 잘 마치고 ${pay}원을 벌었다.`
        : `${person.name}은(는) 일이 꼬였지만 ${pay}원을 받았다.`
      break
    }
    case 'rest':
      changeNeeds(person, { fatigue: -22, stress: result.success ? -25 : -14, loneliness: 1 })
      message = result.success
        ? `${person.name}은(는) 여유로운 휴식으로 마음을 다독였다.`
        : `${person.name}은(는) 잠깐 쉬었지만 마음이 개운하지 않았다.`
      break
    case 'study':
      if (person.stats.effort <= 0) {
        changeNeeds(person, { stress: 7 })
        message = `${person.name}은(는) 노력할 힘이 없어 책을 덮었다.`
        tone = 'warning'
      } else {
        person.stats.effort = clamp(person.stats.effort - 1, 0, MAX_STAT)
        person.stats.experience = clamp(person.stats.experience + (result.success ? 3 : 1), 0, 9999)
        if (result.success && person.stats.experience % 20 < 3) {
          person.stats.ability = clamp(person.stats.ability + 1, MIN_STAT, MAX_STAT)
        }
        changeNeeds(person, { fatigue: 8, stress: result.success ? 5 : 10 })
        message = result.success
          ? `${person.name}은(는) 공부에 몰입해 경험을 쌓았다.`
          : `${person.name}은(는) 집중하지 못했지만 조금은 배웠다.`
      }
      break
    case 'meet':
      changeNeeds(person, { loneliness: result.success ? -32 : -12, stress: result.success ? -6 : 4 })
      if (result.success) person.stats.fame = clamp(person.stats.fame + 1, 0, MAX_STAT)
      message = result.success
        ? `${person.name}은(는) 이웃과 즐거운 이야기를 나눴다.`
        : `${person.name}은(는) 이웃과 어색하게 인사만 나눴다.`
      break
  }

  if (result.critical === 'success') message += ' 놀라울 만큼 완벽한 순간이었다!'
  if (result.critical === 'failure') message += ' 오늘은 정말 운이 없었다.'

  addLog(game, makeLog(`${action.icon} ${message}`, tone, result.roll))
  return result
}

function selectAutomaticAction(game) {
  const { needs, policy, money, stats } = game.person

  if (needs.hunger >= 68 && money >= 8) return 'eat'
  if (needs.fatigue >= 76) return 'sleep'
  if (needs.stress >= 72) return 'rest'
  if (needs.loneliness >= 70) return 'meet'

  const pools = {
    active: ['work', 'work', 'study', 'meet', 'eat', 'rest'],
    balanced: ['work', 'rest', 'study', 'meet', 'eat'],
    calm: ['rest', 'rest', 'eat', 'study', 'meet', 'work'],
  }
  const pool = pools[policy] ?? pools.balanced
  const available = stats.effort > 0 ? pool : pool.filter((action) => action !== 'study')
  return available[Math.floor(Math.random() * available.length)]
}

function passOneHour(game) {
  game.world.hour += 1
  if (game.world.hour < 23) return

  changeNeeds(game.person, { fatigue: -62, stress: -12, hunger: 18, loneliness: 3 })
  game.person.stats.effort = clamp(game.person.stats.effort + 2, 0, MAX_STAT)
  game.world.day += 1
  game.world.hour = 7
  game.person.age += 1
  addLog(
    game,
    makeLog(`🌅 새로운 하루가 밝았다. ${game.person.name}은(는) ${game.person.age}살이 되었다.`, 'day'),
  )
}

export function createGame(input) {
  const name = String(input.name ?? '').trim().slice(0, 20)
  if (!name) throw new Error('피플의 이름을 입력해 주세요.')

  const game = {
    version: 1,
    updatedAt: new Date().toISOString(),
    player: { id: 'local-player', loginType: 'local-test' },
    person: {
      id: crypto.randomUUID(),
      name,
      age: 7,
      gender: String(input.gender ?? '미정').slice(0, 20),
      appearance: String(input.appearance ?? '수수한 인상').trim().slice(0, 80),
      mbti: String(input.mbti ?? 'ISFP').toUpperCase().slice(0, 4),
      policy: ['active', 'balanced', 'calm'].includes(input.policy) ? input.policy : 'balanced',
      job: '동네 심부름꾼',
      money: 100,
      home: { x: 0, y: 0 },
      stats: {
        talent: randomStat(),
        effort: randomStat(),
        charm: randomStat(),
        ability: randomStat(),
        experience: 0,
        fame: 0,
      },
      needs: { hunger: 18, fatigue: 12, stress: 8, loneliness: 16 },
      health: 100,
    },
    world: { day: 1, hour: 7 },
    logs: [],
  }

  addLog(game, makeLog(`🏠 ${name}의 첫 번째 아침이 시작되었다.`, 'day'))
  return game
}

export function runManualAction(game, actionType) {
  performAction(game, actionType)
  passOneHour(game)
  return game
}

export function runAutomaticHour(game) {
  const actionCount = Math.random() < 0.5 ? 1 : 2
  for (let index = 0; index < actionCount; index += 1) {
    performAction(game, selectAutomaticAction(game))
  }
  passOneHour(game)
  return game
}

export function runUntilNextDay(game) {
  const currentDay = game.world.day
  while (game.world.day === currentDay) {
    runAutomaticHour(game)
  }
  return game
}

export async function loadGame() {
  try {
    return JSON.parse(await readFile(SAVE_PATH, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function saveGame(game) {
  game.updatedAt = new Date().toISOString()
  await mkdir(SAVE_DIR, { recursive: true })
  const temporaryPath = `${SAVE_PATH}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(game, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, SAVE_PATH)
  return game
}

export async function deleteGame() {
  const { rm } = await import('node:fs/promises')
  await rm(SAVE_PATH, { force: true })
}

export { ACTIONS, SAVE_PATH }
