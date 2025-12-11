# Firebase Storage 설정 가이드

## Firebase Storage 활성화

1. [Firebase Console](https://console.firebase.google.com)에 접속합니다.
2. 프로젝트를 선택합니다.
3. 왼쪽 메뉴에서 **"Storage"**를 클릭합니다.
4. **"시작하기"** 또는 **"Get started"** 버튼을 클릭합니다.
5. 보안 규칙을 선택합니다:
   - **테스트 모드**: 개발 중에만 사용 (30일 후 만료)
   - **프로덕션 모드**: 프로덕션 환경용 (보안 규칙 설정 필요)
6. 위치를 선택합니다 (Firestore와 동일한 위치 권장).
7. **"완료"** 버튼을 클릭합니다.

## Storage 보안 규칙 설정

1. Firebase Console → Storage → **"규칙"** 탭 클릭
2. 다음 규칙을 입력합니다:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 제품 이미지: 인증된 사용자만 업로드 가능, 모든 사용자가 읽기 가능
    match /products/{userId}/{productId}/{fileName} {
      allow read: if true; // 모든 사용자가 읽기 가능
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // 관리자는 모든 파일에 접근 가능
    match /{allPaths=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.email in ['yj63486202@gmail.com'];
    }
  }
}
```

3. **"게시"** 버튼을 클릭합니다.

## 이미지 업로드 기능

제품 등록 페이지에서 이미지 파일을 직접 업로드할 수 있습니다:

1. 제품 등록 페이지로 이동
2. "제품 이미지" 섹션에서 파일 선택
3. 이미지가 자동으로 Firebase Storage에 업로드됩니다
4. 업로드된 이미지의 URL이 자동으로 저장됩니다

## 지원되는 이미지 형식

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## 파일 크기 제한

- 최대 파일 크기: 5MB
- 권장 크기: 1MB 이하 (빠른 로딩을 위해)

## 문제 해결

### "Firebase Storage가 초기화되지 않았습니다" 오류

- Firebase Console에서 Storage가 활성화되어 있는지 확인하세요.
- 환경 변수가 올바르게 설정되어 있는지 확인하세요.

### 이미지 업로드 실패

- 파일 크기가 5MB 이하인지 확인하세요.
- 이미지 파일 형식인지 확인하세요.
- Storage 보안 규칙이 올바르게 설정되어 있는지 확인하세요.

### 이미지가 표시되지 않음

- Storage 보안 규칙에서 `allow read: if true`가 설정되어 있는지 확인하세요.
- 이미지 URL이 올바르게 저장되었는지 확인하세요.

