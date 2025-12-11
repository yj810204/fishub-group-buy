# Google 로그인 오류 해결: auth/unauthorized-domain

## 오류 원인

이 오류는 Firebase Console에서 인증된 도메인(Authorized domains)에 현재 도메인이 등록되지 않아서 발생합니다.

## 해결 방법

### 1. Firebase Console에서 인증된 도메인 추가

1. [Firebase Console](https://console.firebase.google.com)에 접속합니다.
2. 프로젝트를 선택합니다.
3. 왼쪽 메뉴에서 **"Authentication"**을 클릭합니다.
4. 상단의 **"Settings"** (설정) 탭을 클릭합니다.
5. 아래로 스크롤하여 **"Authorized domains"** (승인된 도메인) 섹션을 찾습니다.

### 2. 도메인 추가

다음 도메인들을 추가해야 합니다:

#### 개발 환경용 (필수)
- `localhost` - 이미 기본으로 포함되어 있을 수 있지만 확인하세요
- `127.0.0.1` - localhost의 IP 주소

#### 프로덕션 환경용 (배포 시 필요)
- 실제 배포 도메인 (예: `yourdomain.com`)
- Vercel 배포 시: `your-project.vercel.app`

### 3. 도메인 추가 방법

1. "Authorized domains" 섹션에서 **"Add domain"** (도메인 추가) 버튼을 클릭합니다.
2. 도메인을 입력합니다 (예: `localhost`).
3. **"Add"** 버튼을 클릭합니다.

### 4. 확인

다음 도메인들이 목록에 있는지 확인하세요:
- ✅ `localhost` (기본 포함)
- ✅ `127.0.0.1` (필요 시 추가)
- ✅ 실제 배포 도메인 (배포 시 추가)

## 빠른 해결 체크리스트

- [ ] Firebase Console → Authentication → Settings로 이동
- [ ] "Authorized domains" 섹션 확인
- [ ] `localhost`가 목록에 있는지 확인
- [ ] 없으면 "Add domain"으로 추가
- [ ] 브라우저 새로고침
- [ ] 개발 서버 재시작: `npm run dev`

## 추가 확인 사항

### Google 로그인이 활성화되어 있는지 확인

1. Firebase Console → Authentication
2. "Sign-in method" 탭 클릭
3. "Google"이 **"Enabled"** 상태인지 확인
4. 프로젝트 지원 이메일이 설정되어 있는지 확인

### 환경 변수가 올바른지 확인

`.env.local` 파일에 Firebase 설정이 올바르게 입력되어 있는지 확인하세요:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

## 문제 해결

여전히 오류가 발생한다면:

1. **브라우저 캐시 삭제**: 개발자 도구(F12) → Application → Clear storage
2. **시크릿 모드에서 테스트**: 캐시 문제를 제외하기 위해
3. **개발 서버 재시작**: `npm run dev`
4. **Firebase Console에서 도메인 확인**: Settings → Authorized domains에서 `localhost`가 있는지 다시 확인

## 주의사항

- `localhost`는 기본적으로 포함되어 있지만, 때로는 명시적으로 추가해야 할 수 있습니다.
- 프로덕션 환경에서는 실제 도메인을 반드시 추가해야 합니다.
- 도메인 추가 후 즉시 적용되지만, 브라우저 캐시로 인해 몇 분이 걸릴 수 있습니다.

