const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/graphql'

const GAME_FIELDS = /* GraphQL */ `
  fragment GameFields on GameSave {
    version
    updatedAt
    player { id loginType }
    person {
      id
      name
      age
      gender
      appearance
      mbti
      policy
      job
      money
      status
      health
      healthProfile { peakAge declineStartAge expectedLifespan }
      children { id name age gender appearance mbti policy }
      home { x y }
      stats { talent effort charm ability experience fame }
      needs { hunger fatigue stress loneliness }
    }
    world { day hour }
    logs { id at message tone roll }
  }
`

async function execute(query, variables = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const payload = await response.json()
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || 'GraphQL 요청을 처리하지 못했습니다.')
  }
  return payload.data
}

export async function fetchInitialGame() {
  return execute(`
    ${GAME_FIELDS}
    query InitialGame {
      game { ...GameFields }
      actions { key label icon }
    }
  `)
}

export async function createNewGame(input) {
  const data = await execute(
    `
      ${GAME_FIELDS}
      mutation CreateGame($input: CreateGameInput!) {
        createGame(input: $input) { ...GameFields }
      }
    `,
    { input: { ...input, policy: input.policy.toUpperCase() } },
  )
  return data.createGame
}

export async function performAction(action) {
  const data = await execute(
    `
      ${GAME_FIELDS}
      mutation PerformAction($action: ActionType!) {
        performAction(action: $action) { ...GameFields }
      }
    `,
    { action: action.toUpperCase() },
  )
  return data.performAction
}

export async function advanceHour() {
  const data = await execute(`
    ${GAME_FIELDS}
    mutation AdvanceHour { advanceHour { ...GameFields } }
  `)
  return data.advanceHour
}

export async function advanceDay() {
  const data = await execute(`
    ${GAME_FIELDS}
    mutation AdvanceDay { advanceDay { ...GameFields } }
  `)
  return data.advanceDay
}

export async function continueLife(mode, childId = null) {
  const data = await execute(
    `
      ${GAME_FIELDS}
      mutation ContinueLife($mode: ContinuationMode!, $childId: ID) {
        continueLife(mode: $mode, childId: $childId) { ...GameFields }
      }
    `,
    { mode, childId },
  )
  return data.continueLife
}

export async function resetGame() {
  const data = await execute('mutation ResetGame { resetGame }')
  return data.resetGame
}
