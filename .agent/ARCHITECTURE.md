# 피플 애플리케이션 구조

## 기본 원칙

- 웹, 모바일 등 모든 클라이언트는 동일한 GraphQL API를 사용한다.
- 클라이언트는 세이브 파일이나 데이터베이스에 직접 접근하지 않는다.
- 게임 판정과 상태 변경은 API의 게임 엔진에서만 수행한다.
- 화면 전용 표현과 사용자 상호작용은 각 클라이언트가 담당한다.
- GraphQL 필드나 뮤테이션을 변경할 때는 기존 클라이언트 호환성을 먼저 확인한다.

## 워크스페이스

```text
apps/
├─ web/                 Vue 3 웹 클라이언트
│  └─ src/api/          GraphQL 요청 모듈
└─ api/                 Node GraphQL 백엔드
   ├─ src/schema.mjs    공개 GraphQL 계약과 resolver
   ├─ src/game.mjs      게임 규칙과 세이브 저장
   └─ data/saves/       초기 테스트 JSON 세이브
```

## GraphQL 계약

### Query

- `game`: 현재 로컬 피플의 전체 게임 상태를 조회한다.
- `actions`: 클라이언트에서 표시할 행동 목록을 조회한다.

### Mutation

- `createGame(input)`: 새 피플을 만들고 저장한다.
- `performAction(action)`: 지정한 행동을 실행하고 한 시간을 진행한다.
- `advanceHour`: 자동 행동 1~2회를 실행하고 한 시간을 진행한다.
- `advanceDay`: 남은 시간의 자동 행동을 실행하고 다음 날로 진행한다.
- `resetGame`: 초기 테스트 세이브를 삭제한다.

## 이후 모바일 앱을 만들 때

- 모바일 앱은 `apps/mobile`처럼 별도 워크스페이스로 추가한다.
- `VITE_GRAPHQL_URL`에 해당하는 모바일 환경 설정으로 API 주소를 지정한다.
- 모바일에서도 세이브 로직을 복제하지 않고 GraphQL API를 호출한다.
- 인증이 추가되면 GraphQL context에서 사용자별 세이브 또는 DB 레코드를 선택한다.

## 개발 포트

- GraphQL API는 `4000`부터 시작해 사용 중이면 `4001`, `4002` 순서로 자동 선택한다.
- Vue 웹 서버는 `5173`부터 시작해 Vite의 비엄격 포트 fallback으로 다음 포트를 선택한다.
- 웹 시작 포트는 `WEB_PORT`로 바꿀 수 있으며 지정하지 않으면 `5173`부터 시작한다.
- 루트의 `pnpm dev`는 API가 선택한 실제 포트를 웹의 `VITE_GRAPHQL_URL`에 주입한다.
- `pnpm dev:web`만 실행할 때 API 포트를 바꾸려면 `API_PORT`를 지정한다.

## 테스트 격리

- 자동 테스트는 `SAVE_FILE_PATH` 환경 변수로 별도 JSON 파일을 사용한다.
- 실제 `local-player.json`을 테스트에서 덮어쓰거나 삭제하지 않는다.
