# Vercel 배포 가이드

Next.js 앱을 Vercel에 배포하면 CORS 문제 없이 Cloud Functions를 사용할 수 있습니다.

## 배포 순서

### 1. Git 저장소에 코드 업로드 (필수) ⚠️

**먼저 Git 저장소에 코드를 올려야 합니다!** 자세한 내용은 `GIT_SETUP.md` 파일을 참고하세요.

```bash
# Git 초기화 (아직 안 했다면)
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: 공동구매 플랫폼"

# GitHub에 새 저장소 생성 후
# 원격 저장소 추가 (YOUR_USERNAME과 YOUR_REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 메인 브랜치로 푸시
git branch -M main
git push -u origin main
```

**중요**: `.env.local` 파일은 Git에 올리지 마세요 (이미 `.gitignore`에 포함되어 있음)

### 2. Vercel 계정 생성
1. [Vercel](https://vercel.com)에 접속
2. GitHub 계정으로 로그인 (또는 이메일로 가입)

### 3. 프로젝트 배포
1. Vercel 대시보드에서 "Add New Project" 클릭
2. **GitHub 저장소 선택** (1단계에서 올린 저장소)
3. 프로젝트 설정:
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: `.next` (기본값)

### 3. 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수를 추가:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 4. 배포
1. "Deploy" 버튼 클릭
2. 배포 완료 후 제공되는 URL로 접속

## 장점
- ✅ CORS 문제 없음 (같은 도메인에서 실행)
- ✅ Next.js 최적화 지원
- ✅ 자동 HTTPS
- ✅ CDN 제공
- ✅ 무료 플랜 제공

## Firebase Authentication 도메인 추가
배포 후 Vercel URL을 Firebase Console의 "Authorized domains"에 추가해야 합니다:
1. Firebase Console → Authentication → Settings
2. "Authorized domains"에 Vercel URL 추가 (예: `your-project.vercel.app`)

