<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> 위 블록은 자동 생성이다(BEGIN/END 사이). **아래부터가 사람이 쓴 규칙이니 지울 수 없다.**

## 🚨 웹 수정 시 필수: 로컬 서버로 **눈으로 보여 드리고** 푸시 (2026-09-23 사장님 지시)

화면이 바뀌는 수정은 **푸시 전에 반드시 로컬 서버를 띄워 사장님이 직접 보게 한다.**
"코드는 맞습니다"로 끝내지 않는다. 예외 없음.

**왜**: 2026-09-23 데일리뉴스 감사 메일에서 로고를 `height:26px` 로 잡아 글자가 좁쌀처럼 뭉개진 채
고객에게 나갔다. 코드에는 오류가 없었고 문법 검사도 통과했다 — **눈으로 봐야만 보이는 문제였다.**

**여는 법.** `.claude/launch.json` 은 `.gitignore` 에 걸려 **git 에 안 올라간다 → PC 마다 새로 만든다**:
```json
{ "version": "0.0.1", "configurations": [
  { "name": "jobs-crm-dev", "runtimeExecutable": "npm",
    "runtimeArgs": ["--prefix", "<이 저장소의 절대경로>", "run", "dev"], "port": 3000 } ] }
```
→ `preview_start` 로 띄우고 `http://localhost:3000` 을 보여 드린다.
⚠️ `--prefix` 를 빼면 **주 작업폴더(앱 저장소)의 `npm run start` 가 잡혀 엉뚱한 서버가 뜬다.**

**⛔ 로컬 서버라고 안전한 것이 아니다.** `.env` 가 **운영 DB·운영 서비스**를 가리킨다 —
화면만 내 컴퓨터일 뿐 손대는 대상은 진짜다.
- ✅ 화면을 **열어 보는 것**, `read_page`·스크린샷
- ⛔ 폼 제출 · 저장 · 삭제 — **전부 운영 데이터에 그대로 쓰인다**

**푸시는 사장님이 화면을 보고 승낙한 뒤에 한다.** 먼저 올려놓고 묻지 않는다.
