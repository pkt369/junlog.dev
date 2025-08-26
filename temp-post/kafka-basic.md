---
title:
  ko: "Kafka로 시스템 신뢰성 보장하기: 구조, 전략, 그리고 테스트"
  en: "Ensuring System Reliability with Kafka: Architecture, Strategies, and Testing"
excerpt:
  ko: "Kafka의 복제, 장애 복구, 테스트 전략을 통해 신뢰성 있는 시스템을 어떻게 구축할 수 있는지 테스트를 통해 알아보겠습니다."
  en: "Learn how Kafka helps build reliable systems through replication, failover, and testing strategies—backed by real-world experience and practical examples."
date: "2025-07-27"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Kafka", "Backend", "high traffic", "reliable"]
slug: "kafka-basic"
---

# 카프카란 무엇인가
먼저 카프카란 메세징 큐 시스템으로 요청을 서버에서 바로 받아서 처리하는 것보다 컨슈머를 통해서 순차적으로 처리하기 위해 만들어진 시스템입니다.
보통 요청을 하면 응답이 오기까지 기다려야하는데 카프카에서 받아주고 응답으로 바로 내려줌으로써 비동기로 동작할 수 있게 도와줍니다.

다른 예시로는 한번에 스프링에서 제공하는 커넥션보다 많은 요청이 들어오는 경우 대기할 수 있는 최대 대기시간(connectionTimeout) 까지 기다린 다음 에러를 돌려보냅니다.
반면 카프카는 메세지 유효기간은 있으나 컨슈머 입장에서 대기 시간 제한이 없습니다.
즉, 과장해서 1일이 지나도 괜찮다는 얘기입니다.

# 카프카는 언제 사용해야 하나?
위에서 언급했듯이 비동기로 동작하기 위해서 카프카를 사용하는데 사실 이것보다더 큰 이유가 있습니다. 바로 시스템 안정성때문에 사용합니다.
카프카는 레빗엠큐와 다르게 메모리에 올리긴하지만 하드부분에 어디까지 메세지를 소비했는지 로깅을 하기 때문에 카프카 과부하로 죽어도 다시 재복구할 수 있습니다.

이말은 즉, 서버가 죽어서 받은 요청을 에러로 돌리는게 아니라 카프카에서 저장해준다는 것입니다.
이렇게 함으로써 유저는 요청에 대해 컨슈머가 확실하게 받을 수 있게 해줍니다.

그럼 언제까지 괜찮을까요? 기준은 개발자마다 다르겠지만 제 생각은 high traffic 을 예상한다면 바로 적용하는게 좋다고 생각합니다.
백엔드 개발자에게 가장 중요한 부분은 시스템 안정성라고 생각합니다.

---language-separator---