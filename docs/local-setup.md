# 로컬 환경 설정 가이드

처음 프로젝트에 참여하는 개발자를 위한 단계별 가이드.

---

## 1. 사전 준비 (최초 1회)

### Node.js 설치
- [Node.js 공식 사이트](https://nodejs.org/)에서 **LTS 버전** 다운로드
- 설치 확인: `node -v` (v22 이상)

### pnpm 설치
```bash
npm install -g pnpm
pnpm -v  # 10.x 이상 확인
```

> pnpm은 npm보다 빠르고 디스크 효율적인 패키지 매니저다.
> 이 프로젝트는 모노레포(여러 프로젝트를 하나의 저장소에서 관리)이기 때문에 pnpm의 워크스페이스 기능을 사용한다.

### Docker Desktop 설치
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 다운로드 및 설치
- 설치 후 **PC 재시작** 필요 (WSL2 활성화)
- Docker Desktop 실행 후 좌측 하단에 "Engine running" 확인

> **Docker가 처음이라면:**
> Docker는 "가상 컴퓨터"라고 생각하면 된다. 내 PC에 MySQL을 직접 설치하는 대신, Docker가 만든 격리된 공간(컨테이너) 안에 MySQL을 실행한다. 장점:
> - 내 PC 환경을 더럽히지 않는다
> - `docker compose up` 한 줄로 DB, API, 프론트 전부 실행된다
> - 팀원 모두 동일한 환경에서 개발할 수 있다
> - 안 쓸 때 `docker compose down`으로 깔끔하게 종료
>
> 자주 쓰는 명령어:
> - `docker compose up` - 서비스 전부 시작
> - `docker compose up --build` - 코드 변경 후 다시 빌드해서 시작
> - `docker compose down` - 서비스 전부 종료
> - `docker compose down -v` - 종료 + DB 데이터도 삭제
> - `docker compose logs api` - api 서비스 로그 보기
> - `docker compose ps` - 실행 중인 서비스 목록

### Git
- 이미 설치되어 있다면 넘어간다
- 없다면 [Git 공식 사이트](https://git-scm.com/)에서 설치

---

## 2. 프로젝트 클론

```bash
git clone https://github.com/pppclove29-bit/fearless-tasting.git
cd fearless-tasting
```

---

## 3. 환경 변수 설정

```bash
# apps/api 폴더에 .env 파일 생성
cp apps/api/.env.example apps/api/.env
```

`.env` 파일을 열어서 필요 시 수정한다. 로컬 Docker 기본값으로 바로 사용 가능하다.

```env
DATABASE_URL="mysql://app:app1234@localhost:3306/fearless_tasting"
DATABASE_READER_URL="mysql://app:app1234@localhost:3307/fearless_tasting"
```

> `.env` 파일은 **절대 Git에 커밋하지 않는다.** `.gitignore`에 등록되어 있다.

---

## 4. Docker로 실행 (권장)

### 전체 서비스 한 번에 띄우기

```bash
docker compose up --build
```

이 명령 하나로 다음이 모두 실행된다:
- MySQL Writer (포트 3306)
- MySQL Reader (포트 3307)
- NestJS API 서버 (포트 4000)
- Astro 프론트엔드 (포트 4321)

### 확인 방법

| 서비스 | 확인 URL | 정상이면 |
|--------|----------|----------|
| API 서버 | http://localhost:4000 | 페이지 표시됨 |
| API 엔드포인트 | http://localhost:4000/restaurants | `[]` 반환 |
| 프론트엔드 | http://localhost:4321 | "무모한 시식가" 페이지 |

### 종료

```bash
# 터미널에서 Ctrl+C 또는
docker compose down
```

### DB 데이터 초기화 (처음부터 다시)

```bash
docker compose down -v  # 볼륨까지 삭제
docker compose up --build
```

---

## 5. 로컬 직접 실행 (Docker 없이)

Docker 없이 실행할 경우, MySQL을 별도로 설치해야 한다.

### 의존성 설치

```bash
pnpm install
```

### Prisma 클라이언트 생성

```bash
pnpm --filter @repo/api exec prisma generate
```

### DB 마이그레이션

```bash
pnpm --filter @repo/api exec prisma migrate dev
```

### 개발 서버 실행

```bash
# 전체 동시 실행
pnpm dev

# 또는 개별 실행
pnpm --filter @repo/api dev    # 백엔드만 (포트 4000)
pnpm --filter @repo/web dev    # 프론트엔드만 (포트 4321)
```

---

## 6. 유용한 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 전체 개발 서버 실행 |
| `pnpm build` | 전체 빌드 |
| `pnpm lint` | 전체 린트 검사 |
| `pnpm --filter @repo/api exec prisma studio` | DB GUI 열기 (브라우저) |
| `pnpm --filter @repo/api exec prisma migrate dev --name <이름>` | DB 마이그레이션 생성 |
| `docker compose logs api` | API 서버 로그 확인 |
| `docker compose logs mysql-writer` | MySQL Writer 로그 확인 |

---

## 7. IDE 설정 (VSCode 권장)

### 추천 확장

- **Astro** - Astro 파일 지원
- **Prisma** - Prisma 스키마 문법 지원
- **ESLint** - 린트 자동 표시
- **Prettier** - 코드 포맷팅

### 프로젝트 열기

**반드시 루트 폴더**(`무모한 시식가/` 또는 `fearless-tasting/`)를 VSCode에서 열어야 한다. `apps/web`이나 `apps/api`만 따로 열면 모노레포 설정이 제대로 동작하지 않는다.

---

## 8. 첫 번째 작업 시작하기

1. `develop` 브랜치에서 새 브랜치를 만든다
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/내-기능명
   ```

2. 코드를 작성한다

3. 커밋한다 (컨벤션 참고: [conventions.md](conventions.md))
   ```bash
   git add .
   git commit -m "feat(api): 식당 검색 기능 추가"
   ```

4. 푸시하고 PR을 생성한다
   ```bash
   git push origin feature/내-기능명
   ```

5. GitHub에서 PR을 생성하고, [code-review-guide.md](code-review-guide.md) 기준으로 셀프 리뷰한다
