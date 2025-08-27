---
title:
  ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (1)"
  en: "Handling 2,000 TPS: Payment System (Part 1)"
excerpt:
  ko: "아직 최적화 전 상태에서 시스템이 얼마나 트래픽을 견디는지 테스트하고, 왜 아키텍처를 공부해야 하는지 알아보겠습니다."
  en: "We will test how much traffic the system can handle in its unoptimized state and explore why studying the architecture is important."
date: "2025-08-23"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Architecture", "Trafic", "Java", "Spring Boot"]
slug: "payment-system-1"
---

# 시나리오
개발 경험이 쌓이면서 시스템 아키텍처에 흥미가 생겼고, 특히 한국의 토스나 Stripe처럼 많은 트래픽을 처리하는 구조에 관심이 생겼습니다.
그 궁금증을 해소하기 위해 공부와 실제 테스트를 진행했고, 이를 정리하는 과정이 매우 유익했습니다.
그래서 이번 포스팅을 작성하게 되었습니다.

<br>

## 트래픽
Stripe는 피크 시간에 초당 약 <b>13,000 건의 결제</b>를 처리한다고 합니다.([출처](https://startree.ai/user-stories/stripe-journey-to-18-b-of-transactions-with-apache-pinot))
로컬에서 똑같이 13,000 건의 결제를 테스트 해보고 싶지만 개인 로컬 환경에서 테스트할 수 있는 한계를 감안하여, 시뮬레이션에서는 초당 2,000건(TPS, Transactions Per Second)으로 설정하였습니다.

<br>

## 개발 환경
**로컬 환경**
- Mac Model: Apple M3 Pro
- Memory: 36GB
- CPU: 12 core (sysctl -n hw.ncpu)

**개발 환경**
- 백엔드: Java (version: 21) + Spring Boot (version: 3.5.5)
- DB: PostgreSQL
- 부하 테스트: k6
- 서비스 실행: Docker Compose

<br>

## 요구 사항
먼저 결제 시스템을 테스트하기 위해 트랜잭션 관리가 필요했습니다.
따라서 실시간 처리가 요구되었으므로 대부분의 작업을 동기적으로 처리했습니다.
Stripe처럼 유저의 결제 정보를 받아 각 유저별 트랜잭션을 관리하고, 성공, 실패, 환불 등의 상태를 정확히 반영했습니다.


결제 시스템은 읽기보다 쓰기가 많을거라 생각해서 **쓰기 중심 비율(Write/Read ratio)을 9:1**로 정의하였습니다.
- **쓰기(Write)**: 결제 생성, 승인, 취소, 환불 (총 트랜잭션의 약 9/10)  
- **읽기(Read)**: 결제 상태 확인, 잔액 조회, 보고서 생성 (총 트랜잭션의 약 1/10)

<br>

TPS는 100, 1000, 2,000 순으로 테스트했으며, 1분 기준 최대 2,000 TPS에서는 총 약 120,000건의 트랜잭션이 발생시켰습니다.  
테스트 과정에서 Memory, CPU, 서버 상태, 정상 처리 등을 자세히 기록해두었고, 이번 포스팅에서 자세히 서술할 예정입니다.

<br>


## DB 설계
### User (판매자)
| 컬럼       | 타입          | 설명               |
|------------|---------------|------------------|
| id         | BIGSERIAL PK  | 판매자 고유 ID     |
| name       | VARCHAR(100)  | 판매자 이름/상점명 |
| created_at | TIMESTAMP     | 계정 생성일        |


### Transaction (결제)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | PK, 트랜잭션 고유 ID |
| user_id | BIGINT | FK, Users 테이블 참조 |
| amount | DECIMAL(10,2) | 결제 금액 |
| status | VARCHAR(50) | 결제 상태 (PENDING, SUCCESS, FAILED) |
| type | VARCHAR(50) | 결제 타입 (CREATE_PAYMENT, REFUND, CANCEL) |
| created_at | TIMESTAMP | 트랜잭션 생성일 |
| updated_at | TIMESTAMP | 마지막 상태 변경일 |

<br>

# Server 코드 작성 및 세팅하기

파일 구조는 다음과 같습니다.
<img src="/payment-system-1/folder-structure.png" alt="folder-structure" align="center" height="400" />

전체 소스 코드는 Git 에 올려두었으니 궁금하신 경우 참고해주세요.
참고) https://github.com/pkt369/blog-payment-txn
브랜치는 v1 으로 변경해서 참고해주세요! 

먼저 메인 로직에는 **Thread.sleep(1초)** 를 이용해서 결제 걸리는 시간을 구현하였습니다.
또 성공/실패 비율 (99% 성공, 1% 실패) 을 구현해두었습니다.

테스트는 k6 를 이용하기 위해 test-script.js 를 구현해 두었고, init.sql 을 통해 도커로 Postgres 생성시 테이블 생성 및 user 정보를 초기화 하도록 하였습니다.


<br>

그리고 application.properties 에서는 커넥션 풀은 100개, 최대 웨이팅 시간은 30초로 제한을 두었습니다.
명시하진 않았지만 톰켓의 기본 커넥션 값인 200개를 사용하였습니다.

```properties
# Maximum number of connections in the pool
spring.datasource.hikari.maximum-pool-size=100

# Maximum time to wait for a connection from the pool (in milliseconds)
spring.datasource.hikari.connection-timeout=30000
```

<br>

아래의 코드가 k6 로 테스트할 코드입니다.
```js
tps_100: {
  executor: 'constant-arrival-rate',
  rate: 100, // TPS 100
  timeUnit: '1s',
  duration: '1m',
  preAllocatedVUs: 50,
  maxVUs: 200,
},
```

<b>Detail</b>
- <b>executor: 'constant-arrival-rate'</b> 는 고정된 TPS 로 테스트 할 것이다 라는 의미입니다.
- <b>rate</b> 는 1 초당 생성할 요청 수를 의미합니다.
- <b>timeUnit</b> 은 rate 의 단위입니다. 여기서는 1초를 단위로 100번씩 한다는 의미로 사용하였습니다.
- <b>duration</b> 은 얼마 동안 실행할지 입니다.
- <b>preAllocatedVUs</b> 는 초기 할당된 가상 사용자 수 입니다. (VU: Virtual User)
- <b>maxVUs</b> 는 최대 가상 사용자 수 입니다. preAllocatedVUs 를 통해 설정하더라도 부족하면 k6 가 알아서 최대 maxVUs 만큼 더 생성합니다.

<br>

# 테스트하기
build 는 app 을 수정했을때 실행해주시면 됩니다.
docker compose up -d 를 실행하면 k6 가 명령이 없어 자동으로 종료됩니다. 테스트할때 run 명령어로 다시 실행해야 합니다.

```bash
docker compose build
docker compose up -d
docker compose run --rm k6 run /scripts/test-script.js
```

## TPS 100

<img src="/payment-system-1/tps-100-after.png" alt="tps-100-after" align="center" />

<img src="/payment-system-1/tps-100-result.png" alt="tps-100-result" align="center" />

<b>평균 응답 시간은 1.53초였고, 초당 처리된 요청(TPS)은 약 95.6</b>으로 설정한 100 TPS와 거의 일치했습니다.
하지만 일부 요청은 처리되지 않아 <b>116개의 dropped 요청이 발생</b>했습니다.
이미 100 TPS 기준인데도 드롭이 발생한 것을 보면, 이 뒤 테스트에서도 많은 요청들이 처리되지 않을 것을 알 수 있습니다.

<br>

## TPS 1,000

<img src="/payment-system-1/tps-1000-bottleneck.png" alt="tps-1000-bottleneck" align="center" />

<img src="/payment-system-1/tps-1000-after.png" alt="tps-1000-after" align="center" />

이번 테스트에서는 평균 응답 시간이 **17.19초**로 크게 늘어났고, **초당 처리된 요청(TPS)은 약 99.4**였습니다.
설정한 1,000 TPS에 전혀 못믿치는 결과였고, **총 52,100개의 dropped 요청**이 발생하여 서버가 대부분의 요청을 처리하지 못한 상황임을 알 수 있었습니다.

한정적인 커넥션 풀때문에 Request 요청 평균 시간도 약 **17초로 지연**이 크게 발생했습니다.

<br>

## TPS 2,000
<img src="/payment-system-1/tps-2000-after.png" alt="tps-2000-after" align="center" />
<img src="/payment-system-1/tps-2000-bottleneck.png" alt="tps-2000-bottleneck" align="center" />

이번 테스트에서는 **평균 응답 시간이 30.12초**로 매우 길게 나왔습니다.
**초당 처리된 요청(TPS)은 약 98.9**로 이전 테스트들과 크게 다르지 않았습니다.
**총 110,104개의 request 가 드롭**되어 서버가 대부분의 요청을 처리하지 못했습니다.

네트워크 트래픽은 크지 않아, 문제의 **주 원인은 서버와 데이터베이스의 처리 한계**임을 알 수 있습니다.

<br>

서버를 운영한다면 단 하나의 요청의 실패도 중요하기 때문에 다음 포스팅에서는 어떻게 개선하면 모두 성공 시킬 수 있을 지에 대해 알아보겠습니다.



---language-separator---

# Scenario
As I gained more development experience, I became increasingly interested in system architecture, especially in how companies like Toss or Stripe handle large-scale traffic.

This curiosity motivated me to study the concepts in depth and run my own experiments, which I found very valuable. That’s why I decided to write this post.

<br>

## Trafic
Stripe processes over <b>13,000 transactions per second</b> at peak times.([Reference](https://startree.ai/user-stories/stripe-journey-to-18-b-of-transactions-with-apache-pinot))
I wanted to test the same scale, but since it’s not feasible in a local environment, I decided to simulate 2,000 TPS (Transactions Per Second) instead.

<br>

## Development Enviorment 
**Local Enviorment**
- Mac Model: Apple M3 Pro
- Memory: 36GB
- CPU: 12 core (sysctl -n hw.ncpu)

**Backend Enviorment**
- Backend: Java (version: 21) + Spring Boot (version: 3.5.5)
- DB: PostgreSQL
- Load Testing: k6
- Service Runtime: Docker Compose

<br>

## Requirement
To test the payment system, transaction management was required.
Since real-time processing was necessary, most operations were <b>handled synchronously</b>.

Similar to Stripe, user payment information was received, and transactions were managed per user, accurately reflecting success, failure, and refund statuses.


As the system is expected to have more write operations than read operations, <b>a write-heavy ratio (Write/Read) of 9:1</b> was defined:
- <b>Write</b>: Payment creation, approval, cancellation, refund (9/10 of total transactions)
- <b>Read</b>: Checking payment status, balance inquiries, generating reports (1/10 of total transactions)

<br>

TPS was tested at 100, 1,000, and 2,000, and at the maximum of 2,000 TPS, 120,000 transactions were executed in one minute.
During testing, Memory, CPU, server status, and successful processing were carefully recorded, and these details will be elaborated on in this post.

<br>


## Database Design

### User (Seller)
| Column      | Type          | Description           |
|------------|---------------|----------------------|
| id         | BIGSERIAL PK  | Unique seller ID     |
| name       | VARCHAR(100)  | Seller name / shop name |
| created_at | TIMESTAMP     | Account creation date |

### Transaction (Payment)
| Column     | Type           | Description |
|-----------|----------------|-------------|
| id        | BIGSERIAL PK   | Unique transaction ID |
| user_id   | BIGINT         | Foreign key referencing Users table |
| amount    | DECIMAL(10,2)  | Payment amount |
| status    | VARCHAR(50)    | Transaction status (PENDING, SUCCESS, FAILED) |
| type      | VARCHAR(50)    | Transaction type (CREATE_PAYMENT, REFUND, CANCEL) |
| created_at| TIMESTAMP      | Transaction creation date |
| updated_at| TIMESTAMP      | Last status update |

<br>

# Setting up Testing

The folder structure is as follows:
<img src="/payment-system-1/folder-structure.png" alt="folder-structure" align="center" height="400" />

The full source code is available on [GitHub Repository](https://github.com/pkt369/blog-payment-txn) if you’d like to take a closer look.

To simulate real-world payment processing, the **main logic** introduces a small delay of **1 seconds** per transaction using `Thread.sleep(1s)`. This represents the typical processing time of a payment gateway.

For load testing, we prepared a `test-script.js` for **k6**, and `init.sql` automates the database setup by initializing tables and user data, allowing the simulation to run immediately.

<br>

In `application.properties`, we configured the connection pool to allow up to 100 connections with a maximum wait time of 30 seconds. 
The default Tomcat connection limit of 200 connections was used implicitly.

```properties
# Maximum number of connections in the pool
spring.datasource.hikari.maximum-pool-size=100

# Maximum time to wait for a connection from the pool (in milliseconds)
spring.datasource.hikari.connection-timeout=30000
```

<br>

The code below is a test script for k6.
```js
tps_100: {
  executor: 'constant-arrival-rate',
  rate: 100, // TPS 100
  timeUnit: '1s',
  duration: '1m',
  preAllocatedVUs: 50,
  maxVUs: 200,
},
```

<b>Detail</b>
- <b>executor: 'constant-arrival-rate'</b> means the test will run at a fixed TPS (transactions per second).
- <b>rate</b> specifies the number of requests generated per second.
- <b>timeUnit</b> sets the unit of the rate.
- <b>duration</b> indicates how long the test will run.
- <b>preAllocatedVUs</b> is the number of virtual users initially allocated.
- <b>maxVUs</b> is the maximum number of virtual users. Even if the number of preAllocatedVUs is insufficient, k6 will automatically create more until reaching maxVUs.

<br>

# Do Test
The build command is only needed when you modify your code or initialize the project.
When you run `docker compose up -d`, k6 automatically stops because no command is specified.
To run the tests, you need to execute the following command.

```bash
docker compose build
docker compose up -d
docker compose run --rm k6 run /scripts/test-script.js
```

## TPS 100
<img src="/payment-system-1/tps-100-after.png" alt="tps-100-after" align="center" />

<img src="/payment-system-1/tps-100-result.png" alt="tps-100-result" align="center" />


**The average response time was 1.53 seconds**, and the **TPS was about 95.6**, almost matching the target of 100 TPS.
However, some requests failed, with **116 iterations dropped**.
Even at 100 TPS, dropped requests occurred, indicating that higher TPS tests would likely result in even more dropped requests.

<br>

## TPS 1,000

<img src="/payment-system-1/tps-1000-bottleneck.png" alt="tps-1000-bottleneck" align="center" />

<img src="/payment-system-1/tps-1000-after.png" alt="tps-1000-after" align="center" />

In this test, the average response time increased significantly to **17.19 seconds**, while the **TPS was about 99.4**.
The target of 1,000 TPS was far from being reached, and **52,100 iterations were dropped**, showing that the server could not handle most of the requests.

Due to the limited connection pool, **the average request time was delayed to around 17 seconds.**

<br>

## TPS 2,000
<img src="/payment-system-1/tps-2000-after.png" alt="tps-2000-after" align="center" />
<img src="/payment-system-1/tps-2000-bottleneck.png" alt="tps-2000-bottleneck" align="center" />

In this test, **the average response time reached 30.12 seconds**, which is extremely high.
The **TPS was about 98.9**, similar to the previous tests.
**A total of 110,104 requests were dropped**, showing that the server could not handle the majority of incoming requests.

Network traffic was not significant, indicating that the **main bottleneck was the server and database processing limits.**

When running a real service, even a single failed request can be a big deal.  
So in the next post, we’ll take a look at how to improve the system to make sure every request succeeds.
