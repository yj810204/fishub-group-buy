# 이메일/비밀번호 인증 설정 가이드

## Firebase Console에서 이메일/비밀번호 인증 활성화

회원가입 및 이메일 로그인 기능을 사용하려면 Firebase Authentication에서 이메일/비밀번호 인증 방법을 활성화해야 합니다.

### 설정 방법

1. [Firebase Console](https://console.firebase.google.com)에 접속합니다.
2. 프로젝트를 선택합니다.
3. 왼쪽 메뉴에서 **"Authentication"**을 클릭합니다.
4. 상단의 **"Sign-in method"** 탭을 클릭합니다.
5. **"이메일/비밀번호"** (Email/Password)를 찾아 클릭합니다.
6. **"사용 설정"** (Enable) 토글을 활성화합니다.
7. **"저장"** (Save) 버튼을 클릭합니다.

### 추가 설정 (선택사항)

이메일/비밀번호 인증을 활성화하면 다음 옵션도 설정할 수 있습니다:

- **이메일 링크(비밀번호 없이 로그인)**: 이메일로 전송된 링크를 클릭하여 로그인
- **이메일 주소 확인**: 회원가입 시 이메일 인증 필요

기본적으로는 **"이메일/비밀번호"**만 활성화하면 됩니다.

## 문제 해결

### "auth/operation-not-allowed" 오류

이 오류가 발생하면:
1. Firebase Console에서 이메일/비밀번호 인증이 활성화되어 있는지 확인
2. 브라우저를 새로고침하고 다시 시도
3. Firebase 프로젝트 설정에서 Authentication이 제대로 설정되어 있는지 확인

### 기타 오류

- **auth/email-already-in-use**: 이미 등록된 이메일
- **auth/weak-password**: 비밀번호가 너무 짧음 (최소 6자)
- **auth/invalid-email**: 올바르지 않은 이메일 형식

