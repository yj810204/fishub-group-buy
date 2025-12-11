# 공동구매 플랫폼

온라인 공동구매 플랫폼입니다. 더 많은 사람이 함께 구매할수록 더 저렴한 가격으로 제품을 구매할 수 있습니다.

## 기술 스택

- **프레임워크**: Next.js 14 (App Router) + TypeScript
- **스타일링**: Bootstrap 5 (반응형)
- **백엔드**: Firebase (Authentication, Firestore)
- **인증**: Google 로그인, Kakao 로그인 (준비 중)

## 주요 기능

- 회원제 운영 (Google 로그인)
- 제품 등록 및 조회
- 공동구매 참여 시스템
- 구간별 할인 정책 (예: 1-5명 5% 할인, 6-10명 10% 할인)
- 실시간 참여 인원 업데이트
- 주문 내역 관리

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com)에서 새 프로젝트를 생성합니다.
2. Authentication에서 Google 로그인을 활성화합니다.
3. Firestore Database를 생성합니다 (테스트 모드로 시작 가능).
4. 프로젝트 설정 > 일반 탭에서 웹 앱을 추가하고 설정 정보를 복사합니다.

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 프로젝트 구조

```
fishub-group-buy/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 페이지
│   ├── login/             # 로그인 페이지
│   ├── products/          # 제품 목록/상세
│   │   ├── page.tsx       # 제품 목록
│   │   ├── [id]/          # 제품 상세
│   │   └── new/           # 제품 등록
│   └── my/                # 마이페이지
├── components/             # 재사용 컴포넌트
│   ├── auth/              # 인증 관련
│   ├── products/          # 제품 관련
│   └── common/            # 공통 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── firebase/          # Firebase 설정
│   ├── auth.ts            # 인증 로직
│   └── discount.ts        # 할인 계산 로직
├── types/                 # TypeScript 타입 정의
└── public/                # 정적 파일
```

## 데이터베이스 스키마 (Firestore)

### users 컬렉션
- `uid`: 사용자 고유 ID
- `email`: 이메일
- `displayName`: 표시 이름
- `provider`: 로그인 제공자 ('google' | 'kakao')
- `createdAt`: 생성 일시

### products 컬렉션
- `id`: 제품 고유 ID
- `name`: 제품명
- `description`: 제품 설명
- `basePrice`: 시작가
- `discountTiers`: 할인 구간 배열
- `currentParticipants`: 현재 참여 인원
- `status`: 상태 ('active' | 'completed' | 'cancelled')
- `createdAt`: 생성 일시
- `createdBy`: 생성자 UID
- `imageUrl`: 이미지 URL (선택사항)

### orders 컬렉션
- `id`: 주문 고유 ID
- `productId`: 제품 ID
- `userId`: 사용자 ID
- `participantCount`: 참여 시점의 인원 수
- `finalPrice`: 할인 적용된 최종 가격
- `status`: 상태 ('pending' | 'confirmed' | 'cancelled')
- `createdAt`: 생성 일시

## 할인 계산 로직

할인 구간은 제품 등록 시 설정할 수 있으며, 현재 참여 인원에 따라 자동으로 할인율이 적용됩니다.

예시:
- 1~5명: 5% 할인
- 6~10명: 10% 할인
- 11~20명: 15% 할인

## 배포

### Vercel에 배포

1. [Vercel](https://vercel.com)에 프로젝트를 연결합니다.
2. 환경 변수를 Vercel 대시보드에서 설정합니다.
3. 자동으로 배포가 진행됩니다.

### Flutter 웹앱으로 패킹

향후 Flutter 웹뷰를 사용하여 웹앱으로 패킹할 수 있습니다.

## 라이선스

이 프로젝트는 개인 사용 목적으로 개발되었습니다.
