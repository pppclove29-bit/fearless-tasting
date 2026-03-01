# 트러블슈팅

자주 발생하는 문제와 해결 방법.

---

## Docker 관련

### Docker Desktop이 실행되지 않음
**증상:** "Docker Desktop - WSL update failed" 또는 시작 안 됨
**해결:**
1. PC 재시작 (WSL2 커널 업데이트 적용)
2. 그래도 안 되면 PowerShell(관리자)에서:
   ```powershell
   wsl --update
   wsl --set-default-version 2
   ```

### `docker compose up` 시 "port already in use"
**증상:** `Bind for 0.0.0.0:3306 failed: port is already allocated`
**원인:** 로컬에 MySQL이 이미 실행 중
**해결:**
- 로컬 MySQL 종료 후 재실행
- 또는 `docker-compose.yml`에서 포트를 변경 (예: `"3308:3306"`)

### MySQL 컨테이너가 계속 재시작됨
**증상:** `mysql-writer` 상태가 "restarting"
**해결:**
```bash
# 로그 확인
docker compose logs mysql-writer

# 볼륨 초기화 후 재시작
docker compose down -v
docker compose up --build
```

---

## pnpm / 의존성 관련

### "pnpm: command not found"
**해결:**
```bash
npm install -g pnpm
```

### PowerShell에서 "스크립트를 실행할 수 없습니다"
**증상:** `npm.ps1 파일을 로드할 수 없습니다`
**해결:**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### esbuild segfault (Windows Git Bash)
**증상:** `pnpm install` 시 `Segmentation fault` 에러
**원인:** Git Bash 환경에서 esbuild postinstall 호환 문제
**해결:**
- PowerShell 또는 CMD에서 `pnpm install` 실행
- 또는 Docker 환경 사용

### "Module not found" 에러
**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

---

## Prisma 관련

### "Can't reach database server"
**증상:** `Error: P1001: Can't reach database server at localhost:3306`
**원인:** MySQL이 아직 시작되지 않았거나 접속 정보가 틀림
**해결:**
1. Docker가 실행 중인지 확인: `docker compose ps`
2. `.env` 파일의 `DATABASE_URL` 확인
3. MySQL 헬스체크 통과 확인: `docker compose logs mysql-writer`

### "Prisma Client has not been generated"
**해결:**
```bash
pnpm --filter @repo/api exec prisma generate
```

### 스키마 변경 후 타입 에러
**해결:**
```bash
# Prisma 클라이언트 재생성
pnpm --filter @repo/api exec prisma generate

# IDE 재시작 (TypeScript 서버 갱신)
```

---

## IDE 관련

### VSCode에서 TypeScript 에러가 빨간줄로 표시됨
**원인:** `node_modules`가 없거나 Prisma Client가 생성되지 않음
**해결:**
1. `pnpm install` 실행
2. `pnpm --filter @repo/api exec prisma generate` 실행
3. VSCode에서 `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### import 경로에서 "@/"를 인식하지 못함
**원인:** VSCode가 루트 폴더가 아닌 하위 폴더를 열었을 때
**해결:** 반드시 프로젝트 **루트 폴더**를 VSCode에서 열 것

---

## 빌드 관련

### `turbo run build` 실패
**해결:**
```bash
# 캐시 삭제 후 재빌드
pnpm clean
pnpm build
```

### Astro 빌드 시 API 호출 실패
**원인:** 빌드 시점에 API 서버가 실행되지 않고 있을 때 (SSG 페이지에서 API 호출하는 경우)
**해결:** 빌드 전에 API 서버를 먼저 실행하거나, SSR 모드로 전환
