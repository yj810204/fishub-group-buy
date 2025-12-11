# Firestore 권한 오류 해결 방법

## 오류: "Missing or insufficient permissions"

이 오류는 Firestore 보안 규칙이 제대로 설정되지 않아서 발생합니다.

## 해결 방법

### 방법 1: 테스트 모드로 임시 설정 (개발 중에만 사용)

1. Firebase Console에서 프로젝트를 선택합니다.
2. 왼쪽 메뉴에서 "Firestore Database"를 클릭합니다.
3. "규칙" 탭을 클릭합니다.
4. 다음 규칙을 입력합니다:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

⚠️ **주의**: 이 규칙은 개발 중에만 사용하세요. 프로덕션 환경에서는 보안 규칙을 제대로 설정해야 합니다.

5. "게시" 버튼을 클릭합니다.

### 방법 2: 프로덕션용 보안 규칙 설정 (권장)

1. Firebase Console에서 프로젝트를 선택합니다.
2. 왼쪽 메뉴에서 "Firestore Database"를 클릭합니다.
3. "규칙" 탭을 클릭합니다.
4. 다음 규칙을 입력합니다:

```javascript
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
      allow delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    // 주문은 자신의 주문만 읽을 수 있고, 인증된 사용자만 작성 가능
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update: if false; // 주문은 수정 불가
      allow delete: if false; // 주문은 삭제 불가
    }
  }
}
```

5. "게시" 버튼을 클릭합니다.

## 추가 확인 사항

### 1. 인증이 제대로 작동하는지 확인

- 사용자가 로그인되어 있는지 확인하세요.
- 브라우저 콘솔에서 인증 상태를 확인하세요.

### 2. Firestore Database가 생성되었는지 확인

- Firebase Console에서 "Firestore Database"가 생성되어 있는지 확인하세요.
- 데이터베이스가 없으면 "데이터베이스 만들기"를 클릭하여 생성하세요.

### 3. 보안 규칙이 적용되었는지 확인

- 규칙을 수정한 후 "게시" 버튼을 클릭했는지 확인하세요.
- 규칙이 저장되기까지 몇 초 정도 걸릴 수 있습니다.

## 문제 해결

여전히 오류가 발생한다면:

1. 브라우저를 새로고침하세요.
2. 개발 서버를 재시작하세요: `npm run dev`
3. Firebase Console에서 규칙이 제대로 저장되었는지 확인하세요.
4. 브라우저 콘솔에서 더 자세한 오류 메시지를 확인하세요.

