---
title:
  ko: "MeiliSearch 후기"
  en: "MeiliSearch review"
excerpt:
  ko: "검색으로 MeiliSearch 를 사용한 후기"
  en: "A review of using MeiliSearch for implementing search functionality"
date: "2025-07-20"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Search", "Database", "Spring Boot", "Docker", "Java"]
slug: "search-meilisearch"
---

# 사용한 이유
최근에 친구들과 새로운 프로젝트인 [Senagg](https://sena.gg) 를 시작하면서 검색 관련 기능을 맡게 되었습니다.
제가 사용했던 환경은 VPS 환경이었고, 한글 커뮤니티라 한글의 형태소 지원을 해야했습니다.

또한 VPS 라는 제한적인 환경에서 Frontend + Backend + Database 와 함께 사용을 해야했습니다.
그리고 저희는 로깅으로 Vector + Clickhouse + Grafana 조합으로 로깅을 사용하고 있었는데 이미 오버스펙으로 더 이상 무언가 새로운 것을 추가하기가 어려웠습니다.

그래서 고민끝에 다음과 같은 선택지를 생각하였습니다.

1. Mysql 를 내부 데이터베이스로 사용하고 있었는데 Postgresql 로 데이터베이스를 변경해서 검색을 지원.
물론 Mysql 도 FullTextSearch 를 지원하지만 인덱싱을 따로 구현하지 않아서 검색에 불리하다고 생각했습니다.
또한 Ranking 을 지원하지 않아 어떤 데이터를 먼저 보여줘야 하는지 구현하기 힘들었습니다.
하지만 Postgres 에는 Ranking 시스템이 존재하고 이전 프로젝트에서 검색 기능을 사용한 경험이 있어서 후보지로 생각했습니다.

2. MeiliSearch 사용하기
지금 현재 VPS 환경에서 MeiliSearch 를 사용하기 위해서는 충분한 메모리가 필요한데 이 조건을 충족하지 않아 고민을 많이하게 만들었습니다.
하지만 현재 만들어진 좋은 Stack 을 이용하면 손쉽게 검색 기능을 이용 할 수 있을 거라고 생각했습니다.
또한 한글까지 지원하여 모든 부분이 적절했습니다.

그래서 결국 선택은 2번인 MeiliSearch 를 생각하게 되었습니다.
하지만 위에서 말했듯이 사용할려면 충분한 메모리가 필요하여 이 부분은 <b>로깅 스택을 삭제</b>하기로 하였습니다.

하지만 에러를 확인하는 것은 매우 중요한 작업임으로 다음과 같이 작업하였습니다.
- 기존 그라파나에서 에러를 받고 알람으로 주던 부분을 <b>스프링 부트에서 직접 에러</b>를 날려주기로 했습니다.
- 에러 로깅은 VPS 환경에 <b>직접 접근</b>하여 tail 등 명령어로 에러를 체크하기로 했습니다.
- 기존 로깅들은 30일 주기로 Rolling 을 통해서 관리해주기로 했습니다. 
    - 이전에는 클릭하우스에 로깅을 저장하고 있어서 3일주기로 로그 파일을 삭제하고 있었습니다.

위와 같이 작업한 결과 로깅 서버에서 많이 사용하던 메모리를 없애고, MeiliSearch 를 사용할 수 있게 되었습니다. 






---language-separator---
