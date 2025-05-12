---
title:
  ko: "Service vs Repository: Service 에서 어떤것을 사용해야 될까?"
  en: "Service vs Repository: What Should You Use Inside?"
excerpt:
  ko: "Service에서 Service 와 Repository 둘 중 어떤 것을 호출해서 사용하는 게 좋은 구조인지 알아봅시다."
  en: "Let’s explore whether it’s better to call another Service or a Repository within a Service."
date: "2025-05-11"
category:
  ko: "Backend"
  en: "Backend"
tags: ["structure", "spring boot", "service", "repository", "java"]
slug: "service-vs-repository"
---

# 기본 구조

먼저 설명하기에 앞서 서버코드에서 어떻게 구조를 작성하는지에 간단하게 적어보겠습니다.
<br>

가장 구조화된 패턴은 **MVC 패턴**으로 Controller - Service - Repository 로 나뉩니다.
- **Controller** 에서는 request 와 response 를 관리하는 일을 하고 있습니다.
- **Service** 에서는 Business Logic 을 담당하고, 모든 로직은 여기에 작성됩니다.
- **Repository** 에서는 데이터베이스 관련 로직들을 담고 있습니다.

<br>
그럼 여기서 특정 Service 가 다른 비즈니스 로직을 사용할려면 어떻게 해야할까요?

<br>

## Service
먼저 Service 에서 다른 Service 를 호출한다면 예시는 다음과 같습니다.

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendeeService {
  private final AttendeeRepository attendeeRepository;
  private final LineService lineService;
}
```

### 장점
- 코드의 중복이 줄어들어 유지보수에 유리합니다.
  - 동일한 비즈니스 로직을 한곳에 적어두고 사용 가능합니다.

### 단점
- 서비스간 의존성이 높아져 복잡해집니다.
  - 다른 서비스가 가지고 있는 불필요한 의존성을 가지고 올 수 있습니다.
- 서로를 호출하는 구조가 만들어지면 순환 의존성이 만들어질 위험이 있습니다.
- 다른 Service 를 호출하면 연쇄적인 테스트가 필요할수도 있습니다.

## Repository
Service 에서 Repository 를 호출한다면 예시는 다음과 같습니다.

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendeeService {
  private final AttendeeRepository attendeeRepository;
  private final LinRepository lineRepository;
}
```

### 장점
- 서비스가 직접 repository 를 호출해 **구조를 통일**시킬 수 있습니다.
- 테스트 작성시 좀 더 용이해집니다.
  - 불필요한 다른 Service 의 테스트를 피할 수 있습니다.

### 단점
- 코드의 중복으로 유지보수가 어려워 질 수가 있습니다.
  - 물론 요즘은 공통 유틸리티 클래스로 분리해서 이 단점을 극복하기도 합니다.

<br>
<br>

# 결론
구조를 확정하기 전에 검색을 통해 여러 블로그들을 찾아보고, AI 에게 물어보고 나서도 헷갈려 스레드의 투표를 통해 여러 의견들을 모을 수 있었습니다.
결론은 **Service 에서 Repository 만 사용하자** 입니다.

<br>
<br>

<img src="/service-vs-repository/poll.png" alt="service vs repository" align="center" />

<br>
<br>

위 그림을 보면 Service 가 압도적으로 많은 것을 볼수 있고 스레드에서 다음과 같이 답글을 남겨주셨습니다.

<br>

>> **통일성**이 제일 중요해요.
어디에서는 서비스에서 다른 서비스, 어디에서는 서비스에서 레포지토리 이런 식의 예측할 수 없는 코드는 **유지보수하기 정말 힘들어져요.**
프로젝트 내에서 통일성만 유지한다면 어느정도의 코드 중복은 유지보수에 큰 어려움은 아니예요.


<br>
<br>

위의 답글에 크게 공감하였고, 앞으로의 구조에 대해서는 Service -> Repository 형태로 사용해야 겠다고 생각이 들었습니다.
**개발자로써 이유없이 사용하는 것을 지양하고, 항상 생각하면서 개발을 해야겠다고 생각했습니다.**


<br>





---language-separator---

# Basic Structure

Before we dive in, let’s briefly look at how we typically structure a Backend Project.
<br>

Most basic and widely used structure is **MVC Pattern**, which consists of Controller - Service - Repository.
- **Controller** handles request and response.
- **Service** contains Business logic and implements core funcionality.
- **Repository** hanles database interations.

<br>
Then, what should we do if one service needs to use the logic from another service?

<br>
<br>

## Service
First, here’s an example of how a service can call another service.

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendeeService {
  private final AttendeeRepository attendeeRepository;
  private final LineService lineService;
}
```

### Advantage
- By reducing code duplication, we improve maintainability.
  - Business logic can be managed in a single place.

### Disadvantage
- **It increases complexity** by introducing dependencies from the other service.
- It can lead to errors caused by cyclic dependencies.
- If another service calls it, a cascading test might be required.

<br>
<br>

## Repository
Here’s an example of how a service can call a repository.

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendeeService {
  private final AttendeeRepository attendeeRepository;
  private final LinRepository lineRepository;
}
```

### Advantage
- **It helps maintain a consistent structure** when a service directly calls its repository.
- It improves testability by removing unnecessary dependencies on other services.

### Disadvantage
- Code duplication can hurt maintainability.
  - However, this can be mitigated by extracting common logic into utility classes.

<br>
<br>

# Result
Before finalizing the structure, I searched through various blogs and asked AI for advice.

But I was still confused about how to structure the services, so I asked in the Threads app and gathered opinions through a poll.
As a result, conclusion is **services should only communicate with repositories.**

<br>
<br>

<img src="/service-vs-repository/poll.png" alt="service vs repository" align="center" />

<br>
<br>

As shown in the image above, we can see that **Service is the most selected option.**
One person also left a comment, as shown below.

<br>

>> **Consistency** is very important.
If one service calls another service, and other service only calls a repository, **it can make maintainability difficult.**
If we maintain consistency, code duplication won’t be a big problem.

<br>
<br>

I agree with the comment above, and I believe that the Service → Repository structure is the way to go.
**As a developer, I’ll avoid using things without proper consideration and always aim to think critically and provide clear reasoning.**

<br>