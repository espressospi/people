import { createSchema } from 'graphql-yoga'
import {
  ACTIONS,
  continueLife,
  createGame,
  deleteGame,
  loadGame,
  runAutomaticHour,
  runManualAction,
  runUntilNextDay,
  saveGame,
} from './game.mjs'

const typeDefs = /* GraphQL */ `
  enum ActionType {
    EAT
    SLEEP
    WORK
    REST
    STUDY
    MEET
  }

  enum Policy {
    ACTIVE
    BALANCED
    CALM
  }

  enum ContinuationMode {
    CHILD
    NEW
  }

  input CreateGameInput {
    name: String!
    gender: String!
    appearance: String!
    mbti: String!
    policy: Policy!
  }

  type ActionDefinition {
    key: ID!
    label: String!
    icon: String!
  }

  type Player {
    id: ID!
    loginType: String!
  }

  type Home {
    x: Int!
    y: Int!
  }

  type Stats {
    talent: Int!
    effort: Int!
    charm: Int!
    ability: Int!
    experience: Int!
    fame: Int!
  }

  type Needs {
    hunger: Int!
    fatigue: Int!
    stress: Int!
    loneliness: Int!
  }

  type HealthProfile {
    peakAge: Int!
    declineStartAge: Int!
    expectedLifespan: Int!
  }

  type Child {
    id: ID!
    name: String!
    age: Int!
    gender: String!
    appearance: String!
    mbti: String!
    policy: String!
  }

  type Person {
    id: ID!
    name: String!
    age: Int!
    gender: String!
    appearance: String!
    mbti: String!
    policy: String!
    job: String!
    money: Int!
    status: String!
    health: Int!
    healthProfile: HealthProfile!
    children: [Child!]!
    home: Home!
    stats: Stats!
    needs: Needs!
  }

  type World {
    day: Int!
    hour: Int!
  }

  type ActionLog {
    id: ID!
    at: String!
    message: String!
    tone: String!
    roll: Int
  }

  type GameSave {
    version: Int!
    updatedAt: String!
    player: Player!
    person: Person!
    world: World!
    logs: [ActionLog!]!
  }

  type Query {
    game: GameSave
    actions: [ActionDefinition!]!
  }

  type Mutation {
    createGame(input: CreateGameInput!): GameSave!
    performAction(action: ActionType!): GameSave!
    advanceHour: GameSave!
    advanceDay: GameSave!
    continueLife(mode: ContinuationMode!, childId: ID): GameSave!
    resetGame: Boolean!
  }
`

async function requireGame() {
  const game = await loadGame()
  if (!game) throw new Error('먼저 피플을 만들어 주세요.')
  return game
}

const resolvers = {
  Query: {
    game: () => loadGame(),
    actions: () => Object.entries(ACTIONS).map(([key, action]) => ({ key, ...action })),
  },
  Mutation: {
    createGame: async (_, { input }) =>
      saveGame(createGame({ ...input, policy: input.policy.toLowerCase() })),
    performAction: async (_, { action }) =>
      saveGame(runManualAction(await requireGame(), action.toLowerCase())),
    advanceHour: async () => saveGame(runAutomaticHour(await requireGame())),
    advanceDay: async () => saveGame(runUntilNextDay(await requireGame())),
    continueLife: async (_, { mode, childId }) => {
      const previousGame = await requireGame()
      if (previousGame.person.status !== 'dead') throw new Error('피플이 아직 살아 있습니다.')
      return saveGame(continueLife(previousGame, mode.toLowerCase(), childId))
    },
    resetGame: async () => {
      await deleteGame()
      return true
    },
  },
}

export const schema = createSchema({ typeDefs, resolvers })
