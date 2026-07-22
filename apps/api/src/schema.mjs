import { createSchema } from 'graphql-yoga'
import {
  ACTIONS,
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
    home: Home!
    stats: Stats!
    needs: Needs!
    health: Int!
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
    resetGame: async () => {
      await deleteGame()
      return true
    },
  },
}

export const schema = createSchema({ typeDefs, resolvers })
