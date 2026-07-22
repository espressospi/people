# 피플

한 사람의 작은 일상을 지켜보는 방치형 게임의 초기 테스트 버전이다. 웹 클라이언트와 GraphQL 백엔드를 pnpm 워크스페이스로 분리했다.

## 구조

- `apps/web`: Vue 3 웹 클라이언트
- `apps/api`: Node GraphQL API, 게임 엔진, JSON 세이브
- `.agent`: 게임 및 개발 일관성 규칙
- `docs`: PlantUML 구조 문서

## 전체 실행

```bash
pnpm install
pnpm dev
```

- 웹: `http://127.0.0.1:5173`
- GraphQL API: `http://127.0.0.1:4000/graphql`

4000 또는 5173이 이미 사용 중이면 해당 서버가 다음 빈 포트를 자동으로 사용한다. 전체 실행에서는 API가 선택한 포트를 웹 클라이언트에 자동으로 연결한다.

테스트할 때 시작 포트를 직접 지정할 수도 있다.

```powershell
$env:PORT=4100
$env:WEB_PORT=5200
pnpm dev
```

## 따로 실행

```bash
pnpm dev:api
pnpm dev:web
```

웹 개발 서버는 `/graphql` 요청을 API 서버로 전달한다. 다른 주소의 API를 사용할 때는 웹의 `VITE_GRAPHQL_URL` 환경 변수에 전체 GraphQL 주소를 지정한다.

초기 테스트 세이브는 `apps/api/data/saves/local-player.json`에 자동 저장된다.
