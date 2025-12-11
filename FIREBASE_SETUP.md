# Firebase 설정 가이드

## 1. Firebase Console에서 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com)에 접속합니다.
2. "프로젝트 추가" 또는 "Add project"를 클릭합니다.
3. 프로젝트 이름을 입력하고 "계속"을 클릭합니다.
4. Google Analytics 설정은 선택사항입니다 (원하는 대로 선택).
5. "프로젝트 만들기"를 클릭합니다.

## 2. 웹 앱 추가

1. Firebase 프로젝트 대시보드에서 웹 아이콘 (`</>`)을 클릭합니다.
2. 앱 닉네임을 입력합니다 (예: "공동구매 플랫폼").
3. "앱 등록"을 클릭합니다.
4. Firebase SDK 설정 정보가 표시됩니다. 이 정보를 복사해두세요.

## 3. Authentication 설정

1. 왼쪽 메뉴에서 "Authentication"을 클릭합니다.
2. "시작하기"를 클릭합니다.
3. "Sign-in method" 탭을 클릭합니다.
4. "Google"을 클릭하고 "사용 설정"을 활성화합니다.
5. 프로젝트 지원 이메일을 선택하거나 입력합니다.
6. "저장"을 클릭합니다.

## 4. Firestore Database 설정

1. 왼쪽 메뉴에서 "Firestore Database"를 클릭합니다.
2. "데이터베이스 만들기"를 클릭합니다.
3. 보안 규칙 모드를 선택합니다:
   - **테스트 모드**: 개발 중에는 테스트 모드로 시작 (30일 후 만료)
   - **프로덕션 모드**: 프로덕션 환경에서는 보안 규칙을 설정해야 함
4. 위치를 선택합니다 (가장 가까운 지역 선택).
5. "사용 설정"을 클릭합니다.

### 보안 규칙 (프로덕션 환경)

프로덕션 환경에서는 Firestore 보안 규칙을 설정해야 합니다:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 정보만 읽고 쓸 수 있음
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 제품은 모든 인증된 사용자가 읽을 수 있고, 인증된 사용자만 작성 가능
    match /products/{productId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // 주문은 자신의 주문만 읽을 수 있고, 인증된 사용자만 작성 가능
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

## 5. 환경 변수 설정

1. 프로젝트 루트 디렉토리에 `.env.local` 파일을 생성합니다.
2. Firebase Console의 프로젝트 설정 > 일반 탭에서 웹 앱 설정 정보를 복사합니다.
3. `.env.local` 파일에 다음 형식으로 입력합니다:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

### Firebase Console에서 설정 정보 찾는 방법

1. Firebase Console에서 프로젝트를 선택합니다.
2. 왼쪽 상단의 톱니바퀴 아이콘을 클릭합니다.
3. "프로젝트 설정"을 클릭합니다.
4. "일반" 탭에서 "내 앱" 섹션을 찾습니다.
5. 웹 앱을 선택하면 설정 정보가 표시됩니다.

## 6. 개발 서버 재시작

환경 변수를 설정한 후 개발 서버를 재시작해야 합니다:

```bash
npm run dev
```

## 문제 해결

### "Firebase가 초기화되지 않았습니다" 오류
- `.env.local` 파일이 프로젝트 루트에 있는지 확인하세요.
- 환경 변수 이름이 정확한지 확인하세요 (NEXT_PUBLIC_ 접두사 필수).
- 개발 서버를 재시작했는지 확인하세요.

### 인증 오류
- Firebase Console에서 Google 로그인이 활성화되어 있는지 확인하세요.
- 프로젝트 지원 이메일이 설정되어 있는지 확인하세요.

### Firestore 오류
- Firestore Database가 생성되어 있는지 확인하세요.
- 보안 규칙이 올바르게 설정되어 있는지 확인하세요.

