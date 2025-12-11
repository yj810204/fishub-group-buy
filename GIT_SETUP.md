# Git 저장소 설정 가이드

Vercel이나 다른 호스팅 서비스에 배포하기 전에 Git 저장소에 코드를 올려야 합니다.

## 1. Git 초기화 (아직 안 했다면)

```bash
cd /Users/ynjeong/Documents/CodejakaProjects/fishub-group-buy
git init
```

## 2. 파일 추가 및 커밋

```bash
# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: 공동구매 플랫폼"
```

## 3. GitHub에 저장소 생성

1. [GitHub](https://github.com)에 로그인
2. 우측 상단의 "+" 버튼 클릭 → "New repository" 선택
3. 저장소 이름 입력 (예: `fishub-group-buy`)
4. "Public" 또는 "Private" 선택
5. **"Initialize this repository with a README" 체크 해제** (이미 코드가 있으므로)
6. "Create repository" 클릭

## 4. 원격 저장소 연결 및 푸시

```bash
# 원격 저장소 추가 (YOUR_USERNAME과 YOUR_REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 메인 브랜치로 이름 변경
git branch -M main

# 코드 푸시
git push -u origin main
```

## 5. 확인

GitHub 저장소 페이지에서 코드가 올라갔는지 확인하세요.

## 주의사항

- `.env.local` 파일은 Git에 올라가지 않습니다 (`.gitignore`에 포함됨)
- 환경 변수는 Vercel 대시보드에서 별도로 설정해야 합니다
- `node_modules` 폴더도 Git에 올라가지 않습니다

## 다음 단계

Git 저장소에 코드를 올린 후 `VERCEL_DEPLOY.md` 파일의 2단계부터 진행하세요.

