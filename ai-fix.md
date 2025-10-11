`npm ERR! Missing script: "test"` 오류는 루트 `package.json`의 `scripts` 섹션에 `test` 항목이 없을 때 발생합니다. 이 프로젝트 역시 `dev`, `build`, `preview`, `lint`, `agent`만 정의되어 있어 `npm test` 실행 시 위와 같은 메시지가 뜹니다.

## 해결 방법

1. 루트 `package.json`을 열고 `scripts` 블록에 `test` 항목을 추가합니다.
2. 실제 테스트 러너가 없는 상태라면 간단히 lint를 재사용하거나 더미 명령으로 대체할 수 있습니다.

예시:

```jsonc
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0",
  "agent": "node codex-agent-pro.js",
  "test": "npm run lint"
}
```

또는 임시로 에러 메시지만 출력하려면 다음과 같이 설정할 수 있습니다.

```jsonc
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

위와 같이 스크립트를 등록한 뒤 `npm test`를 실행하면 더 이상 `Missing script` 오류가 발생하지 않습니다. 필요 시 실제 테스트 프레임워크(Jest, Vitest 등)를 도입한 뒤 해당 명령으로 교체하면 됩니다.
