# Cloud Functions 설정 가이드

회원 삭제 시 Firebase Authentication에서도 사용자를 삭제하려면 Cloud Functions를 배포해야 합니다.

## 사전 요구사항

1. Firebase CLI 설치
```bash
npm install -g firebase-tools
```

2. Firebase 로그인
```bash
firebase login
```

3. 프로젝트 초기화 (아직 하지 않은 경우)
```bash
firebase init functions
```

## Cloud Functions 배포

1. `functions` 폴더로 이동
```bash
cd functions
```

2. 의존성 설치
```bash
npm install
```

3. TypeScript 컴파일
```bash
npm run build
```

4. 프로젝트 루트로 돌아가기
```bash
cd ..
```

5. Cloud Functions 배포
```bash
firebase deploy --only functions
```

## 배포 확인

배포가 완료되면 Firebase Console에서 확인할 수 있습니다:
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **"Functions"** 클릭
4. `deleteUser` 함수가 표시되는지 확인

## 문제 해결

### "functions/not-found" 오류

Cloud Functions가 배포되지 않았거나 함수 이름이 일치하지 않는 경우 발생합니다.
- `firebase deploy --only functions` 명령으로 배포 확인
- Firebase Console에서 함수가 배포되어 있는지 확인

### "functions/unavailable" 오류

Cloud Functions가 일시적으로 사용 불가능한 경우 발생합니다.
- 잠시 후 다시 시도
- Firebase Console에서 Functions 상태 확인

### 배포 실패

1. Firebase CLI가 최신 버전인지 확인
```bash
firebase --version
npm update -g firebase-tools
```

2. 프로젝트가 올바르게 설정되어 있는지 확인
```bash
firebase projects:list
firebase use <project-id>
```

3. TypeScript 컴파일 오류 확인
```bash
cd functions
npm run build
```

## 참고사항

- Cloud Functions를 배포하지 않으면 Firestore에서만 삭제됩니다.
- Cloud Functions 배포 후에는 Firebase Authentication과 Firestore 모두에서 삭제됩니다.
- Cloud Functions 사용량에 따라 비용이 발생할 수 있습니다 (무료 할당량 내에서는 무료).

