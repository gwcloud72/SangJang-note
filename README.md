# 상장노트 — OpenDART 기반 일정 조회 데모

OpenDART 공시 데이터를 정적 JSON으로 정리하고, React 화면에서 상장·공모청약 일정을 조회하는 포트폴리오 데모입니다.

이 프로젝트는 투자 서비스가 아니라 **React + Vite + GitHub Actions + GitHub Pages** 배포 구조를 보여주기 위한 데모입니다. 추천, 수익률, 청약 유도 표현을 사용하지 않고 일정 확인과 공시 원문 확인에 초점을 맞췄습니다.

## 

- 프로젝트명 : **상장노트**
- 화이트 모드 / 다크 모드 토글
- 사용자가 선택한 테마를 `localStorage`에 저장
- 브라우저 기본 다크모드 설정을 첫 진입 시 반영
- 샘플 회사 데이터 제거
- GitHub Pages 배포 후에도 API Key가 프론트에 노출되지 않는 구조 유지

## 주요 기능

- React 컴포넌트 기반 UI
- 회사명, 공시명, 주관사 검색
- 진행 상태 필터: 전체 / 진행중 / 예정 / 마감 / 확인 필요
- 전체 일정, 진행중, 예정, 데이터 갱신 시점 요약
- OpenDART 공시 원문 링크 표시
- GitHub Actions 예약 실행으로 데이터 갱신
- Vite 빌드 후 GitHub Pages 자동 배포
- 화이트/다크 모드 UI

## 기술 스택

- React 18
- Vite 5
- JavaScript
- GitHub Actions
- GitHub Pages
- OpenDART API


```

## 폴더 구조

```text
.
├── public/data/ipos.json
├── scripts/update-ipos.mjs
├── scripts/validate-data.mjs
├── src/
│   ├── components/
│   ├── hooks/
│   │   ├── useIpoData.js
│   │   └── useTheme.js
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── .github/workflows/deploy-github-pages.yml
├── vite.config.js
└── package.json
```

## 안내 문구

본 서비스는 개인 포트폴리오 및 학습 목적의 데모입니다. 투자자문, 투자권유, 청약 권유 또는 금융상품 판매를 목적으로 하지 않습니다. 실제 청약·투자 판단 전에는 원문 공시와 증권사 안내를 반드시 확인해야 합니다.
