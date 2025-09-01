---
title:
  ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (2)"
  en: "Handling 2,000 TPS: Payment System (Part 2)"
excerpt:
  ko: "모든 TPS 안정적으로 받기 위해 어떻게 개선할 수 있는지 시스템 아키텍처 개선으로 알아보겠습니다."
  en: "Let’s explore how to improve the system architecture to handle all TPS stably."
date: "2025-08-27"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Architecture", "Trafic", "Java", "Spring Boot", "Connection Pool", "Kafka"]
slug: "payment-system-2"
---

# 개선점 찾기
[이전 포스팅](/blog/payment-system-1/)에서는 어떤 세팅으로 테스트하는지, TPS 처리 한계 결과까지 알아보았습니다.
이번 포스팅에서는 병목과 한계점을 어떻게 해결할지에 대해 알아보겠습니다.

<br>

먼저 이전 포스팅에 따르면 서버가 처리하는 속도에 비해 요청하는 속도가 훨씬 많음을 보았습니다.
물론 Spring Boot에서 Hikari 커넥션 풀을 100 보다 크게 설정하여 처리할 수 있지만 학습을 위해 100으로 설정해두었습니다.
하지만 추후 커넥션 수를 늘릴 예정입니다.

앞선 포스팅에서 <b>동기적으로 처리하는 시스템의 한계</b>를 보았고, 시스템 아키텍처 설계로 차근차근 해결해보겠습니다.

제가 생각한 아키텍처는 다음과 같습니다.
<img src="/payment-system-2/tps-architecture-2.png" alt="tps-architecture-2" align="center" />

위 그림처럼 **비동기**를 적용할 예정입니다.
TPS 를 처리하지 못하는 가장 큰 이유는 커넥션 풀이 요청을 따라가지 못해 병목 현상이 일어나는 것인데, 비동기로 처리한다면 두가지 이점이 생깁니다.
1. **스케일 아웃을 통해 처리할 수 있는 TPS 를 늘릴 수 있습니다.**

>> Q: 비동기로 안해도 스케일 아웃할 수 있는게 아닌가요?
A: 네 맞습니다. 하지만 피크 시간에 TPS 가 늘어나면 똑같은 이슈가 발생합니다.
**지금 가장 중요한 목표는 결제가 정상적으로 처리되는 것이므로 Drop 되는 요청을 없애야 합니다.** 그래서 최대한 응답시간을 줄이는게 목표입니다.

2. **결제 처리 시간이 조금 오래걸려도 결제 요청이 Drop 되지 않습니다.**

<br>

## 비동기 (Kafka)
비동기를 처리하기 위해 **메세지 큐 시스템**을 도입해보겠습니다.

저는 **RabbitMQ** 대신 **Kafka**를 선택했는데, 그 이유는 
- Kafka는 메시지를 디스크에 기록하고, Partition 단위로 병렬 처리 가능하기 때문입니다. 즉, 대규모 TPS 처리와 재실행이 가능합니다.
- 반면, RabbitMQ는 Queue 여러 개 생성 가능하지만 대규모 TPS와 Partition 기반 병렬 처리 공식 지원은 제한적입니다.

<br>

카프카는 bitnami 의 카프카를 사용하였습니다.
참고) https://github.com/pkt369/blog-payment-txn/blob/v2/docker-compose.yml

로컬 환경이라 프로토콜은 **PLAINTEXT** 를 사용했고, `enable.idempotence=true` 옵션을 줘서 중복 전송 방지를 하였습니다.
consumer.max-poll-records=10 로 세팅하였고, timeout 은 1분으로 설정하여 컨슈머가 죽지 않도록 설정하였습니다.


<br>

결제 요청을 받아 Kafka에 메시지를 넣는 Producer 서버와, Kafka 메시지를 읽어 실제 결제를 처리하는 Consumer 서버를 분리해야합니다.
실제로는 서버를 분리하는게 맞지만 테스트 목적이라 한 서버안에 구현했습니다.

처음에는 카프카 파티션을 3개로 사용했고, 부족할 경우 늘리는 식으로 테스트했습니다.

<br>

### 코드

```java
// Producer
public void publish(TransactionEvent event) {
  CompletableFuture<SendResult<String, TransactionEvent>> future
   = kafkaTemplate.send(topic, event);

  future.whenComplete((res, ex) -> {
    if (ex != null) {
      System.err.println("Kafka publish failed: " + ex.getMessage());
    }
  });
}

// Service
public String createTransaction(TransactionRequest request) {
    TransactionEvent pending = TransactionEvent.builder()
        .eventId(UUID.randomUUID().toString())
        .userId(request.getUserId())
        .amount(request.getAmount())
        .type(request.getType())
        .status(TransactionStatus.PENDING)
        .createdAt(LocalDateTime.now())
        .build();

    producer.publish(pending);
    return pending.getEventId();
}

```


이벤트 객체를 받아 Kafka의 라운드로빈 방식으로 각 파티션에 전송하고, 전송 후 Event ID 를 반환합니다. 유저는 이 Event ID 를 사용해 Polling 방식으로 처리 완료 여부를 확인할 수 있습니다.
그리고 기존 Service 의 메인 로직을 컨슈머로 옮겼습니다.

전체 코드는 [Git Repository](https://github.com/pkt369/blog-payment-txn/tree/v2) 에서 확인할 수 있습니다.


<br>

# TPS Test
<img src="/payment-system-2/tps-100-after.png" alt="tps-100-after" align="center" />
<img src="/payment-system-2/tps-100-result.png" alt="tps-100-result" align="center" />
<img src="/payment-system-2/tps-1000-result.png" alt="tps-1000-result" align="center" />
<img src="/payment-system-2/tps-2000-result.png" alt="tps-2000-result" align="center" />

위에서 순서대로 TPS 100, 1,000, 2,000 입니다.

이전 동기적으로 동작했을때 **평균 응답 시간은 1.52초였고, 초당 처리된 요청(TPS)은 약 95.6**였습니다.
비동기 처리방식으로 변환 한 후 **3개의 응답 시간의 평균은 0.96 ms 로 약 1,583배 개선**되었습니다.
목표하던 TPS 2000 일때도 **drop 없이 모든 request 가 성공**된 것을 볼 수 있었습니다.


<br>

하지만 문제가 생겼습니다. **컨슈머가 소비하는 속도가 너무 느렸습니다.**
컨슈머가 처리하는 속도는 **유저가 화면에서 결제를 기다리는 시간**으로 이것 또한 중요합니다.
1. **한 컨슈머가 처리하는 전체 트랜잭션 수: 120,000 ÷ 3 = 40,000개**  
2. **처리 시간: 40,000 × 하나당 1초 = 40,000초 => 총 약 11시간 6분으로 매우 느린 것을 확인할 수 있었습니다.**

<br>

# 컨슈머
위에서 Drop 되는 요청을 해결을 했지만, 유저가 결제를 기다리는 시간이 매우 긴 것을 볼 수 있었습니다.
이유는 메세지가 빠르게 소비되지 않았기 때문입니다. 따라서 컨슈머와 파티션을 늘려보겠습니다.

**기존에는 컨슈머와 파티션 3개**로 처리하고 있습니다.

실제 5초내로 결제를 할려면 필요한 동시 처리량 = 120,000 ÷ 5초 = 24,000 TPS -> 즉, 동시에 24,000개 이벤트를 처리해야 합니다.
하지만 제한적인 로컬 환경때문에 먼저 컨슈머를 **500개**까지만 늘려보겠습니다.(500개 동작 시 최대 4분 예측)

<br>

## 500 개 컨슈머 테스트
<img src="/payment-system-2/consumer-0.png" alt="consumer-0" align="center" />


**성공적으로 120,000 개의 메세지 소비를 완료하였고, 동기 방식으로 동작할때 보다 서버의 안정성이 올라갔습니다!**

하지만 **4분이라고 예측했지만 실제로는 30분** 가까이 걸렸습니다.
왜냐하면 **컨슈머와 파티션을 늘려도 Hikari Pool(데이터베이스 Pool)이 늘지 않았기 때문입니다.**
다음 시리즈에서는 데이터베이스 풀을 늘려 컨슈머 소비속도를 높혀 빠르게 응답하도록 해보겠습니다.

<br>

# Troble Shooting
## TPS 2,000 + Consumer 500
TPS 2,000 으로 테스트를 진행했고, 아래의 그림과 같았습니다.
<img src="/payment-system-2/consumer-stop.png" alt="consumer-stop" align="center" />
27806 개에서 컨슈머가 0 개가 되어서 리밸린싱 상태에 걸려 더이상 줄어들지 않았습니다.

로그를 확인해보니 **Member Consumer sending LeaveGroup request to coordinator kafka:9092 (id: 2147483646 rack: null) due to consumer poll timeout has expired.** 였습니다.

에러 이유는 **max-poll-records 설정이 500**이고, **request.timeout.ms=30000**이었기 때문입니다.
즉, **500개의 메세지를 30초안에 해결을 하지 못하면 프로듀서는 해당 요청을 실패로 처리하고, 브로커 입장에서는 해당 컨슈머를 dead로 판단하고 그룹에서 제거합니다.**

그래서 위 그림처럼 활성화된 컨슈머가 0개가 된 것을 알 수 있었습니다.

위를 해결하기 위해서는 **polling 되는 갯수를 줄이거나 timeout.ms 를 늘리는 방법**이 있는데 둘다 적용하였습니다.




---language-separator---

# Finding Improvements
In the [previous post](/blog/payment-system-1/), we looked at how to test and identified the TPS limitations.  
In this post, we’ll explore how to address bottlenecks and overcome those limitations.

<br>

According to the previous post, we saw that the rate of incoming requests was much higher than the server could process.

Of course, we could configure the Hikari connection pool in Spring Boot with more than 100 connections, but for learning purposes it was limited to 100.
We plan to increase the number of connections later.

<br>

In the last post, we also observed **the limitations of a synchronous processing system**, and now we will gradually address them through system architecture design.

The future architecture looks like this.
<img src="/payment-system-2/tps-architecture-2.png" alt="tps-architecture-2" align="center" />

<br>

As the first step, we will introduce asynchronous processing.
The biggest reason the system fails to handle TPS is that the connection pool cannot keep up with the requests, causing bottlenecks. By applying asynchronous processing, we gain two benefits:
1. **We can increase the TPS capacity through scale-out.**

>> Q: Isn’t scale-out possible without asynchronous processing?
A: Yes, that’s true. However, when TPS spikes during peak time, the same issue will occur.
**The most important goal right now is to ensure that payment requests are processed reliably without being dropped. Therefore, reducing response time as much as possible is our key objective.**

2. **Even if payment processing takes a bit longer, requests will not be dropped.**

<br>

## Asynchronous (Kafka)
To enable asynchronous processing, we will introduce a **message queue system.**

I chose **Kafka** instead of **RabbitMQ** for the following reasons:
- Kafka persists messages to disk and supports parallel processing through partitions. This makes it suitable for large-scale TPS handling and replayability.
- RabbitMQ, on the other hand, can create multiple queues but has limited official support for massive TPS and partition-based parallel processing.

<br>

For Kafka, I used the **Bitnami Kafka distribution**.
Reference: [docker-compose.yml](https://github.com/pkt369/blog-payment-txn/blob/v2/docker-compose.yml)

Since this is a local environment, I used the **PLAINTEXT protocol**. To prevent duplicate message delivery, I enabled the option **enable.idempotence=true.**
Additionally, I set **consumer.max-poll-records=10** and configured a **1-minute timeout** to prevent consumers from being killed.


<br>

We need to separate the system into two components:  
- A Producer server that receives payment requests and publishes messages to Kafka. 
- A Consumer server that reads messages from Kafka and processes the actual payment.

In a production environment, these should be deployed separately, but for testing purposes, I implemented both within a single server.

Initially, I configured three Kafka partitions and scaled up as needed during testing.

<br>

### Code

```java
// Producer
public void publish(TransactionEvent event) {
  CompletableFuture<SendResult<String, TransactionEvent>> future
   = kafkaTemplate.send(topic, event);

  future.whenComplete((res, ex) -> {
    if (ex != null) {
      System.err.println("Kafka publish failed: " + ex.getMessage());
    }
  });
}

// Service
public String createTransaction(TransactionRequest request) {
    TransactionEvent pending = TransactionEvent.builder()
        .eventId(UUID.randomUUID().toString())
        .userId(request.getUserId())
        .amount(request.getAmount())
        .type(request.getType())
        .status(TransactionStatus.PENDING)
        .createdAt(LocalDateTime.now())
        .build();

    producer.publish(pending);
    return pending.getEventId();
}

```

The system receives an event object and sends it to Kafka partitions using a **round-robin approach**. After sending, it returns the Event ID, which users can use to check the processing status via polling.
Additionally, the main logic of the existing service has been moved to the consumer.

The complete code is available on the [Git Repository](https://github.com/pkt369/blog-payment-txn/tree/v2).


<br>

# TPS Test
<img src="/payment-system-2/tps-100-after.png" alt="tps-100-after" align="center" />
<img src="/payment-system-2/tps-100-result.png" alt="tps-100-result" align="center" />
<img src="/payment-system-2/tps-1000-result.png" alt="tps-1000-result" align="center" />
<img src="/payment-system-2/tps-2000-result.png" alt="tps-2000-result" align="center" />

The TPS values tested above were 100, 1,000, and 2,000, respectively.

When the system operated synchronously, **the average response time was 1.52 seconds**, and the **TPS achieved was 95.6**.
After converting to an asynchronous processing approach, the average response time across the three tests dropped to **0.96 ms**, an **improvement of roughly 1,583x**.
Even at the target TPS of 2,000, we observed that **all requests were successfully processed without any drops.**


<br>

However, a problem arose. The consumer was processing too slowly.
The processing speed directly affects **how long users have to wait for their payment to complete**, making it a critical factor.
1. **Total transactions per consumer**: 120,000 ÷ 3 = 40,000
2. **Processing time**: 40,000 x 1s = 40,000s => 11 hours and 6 minutes

This highlighted the need for further optimization in consumer throughput.

<br>

# Consumer
Although dropped requests were resolved, we observed that users still had to wait a long time for their payments to complete.
The reason was that messages were not being consumed quickly enough. To address this, we plan to increase both the number of consumers and partitions.

<br>

Previously, we were processing with **3 consumers and 3 partitions.**

To complete payments within 5 seconds, the required throughput would be: **120,000 ÷ 5 seconds = 24,000 TPS**.
This meaning 24,000 events need to be processed simultaneously.

Due to the limitations of the local environment, we will start by increasing the number of consumers to **500**.
(With 500 consumers, the estimated processing time is roughly **4 minutes.**)

<br>

## 500 Consumers Test
<img src="/payment-system-2/consumer-0.png" alt="consumer-0" align="center" />

**We successfully processed all 120,000 messages, and the server’s stability improved compared to the synchronous approach!**

However, although we expected it to take 4 minutes, it actually took nearly **30 minutes.**
This was because **increasing consumers and partitions did not increase the Hikari connection pool (database pool).**

In the next series, we plan to increase the database pool to improve consumer throughput and achieve faster responses.

<br>

# Troble Shooting
## TPS 2,000 + Consumer 500
We ran a test at TPS 2,000, and the results are shown in the figure below.
<img src="/payment-system-2/consumer-stop.png" alt="consumer-stop" align="center" />

During the test, **the number of active consumers dropped to 0 out of 27,806 messages**, triggering a rebalancing state and preventing further reduction.

Checking the logs, I found.
**Member Consumer sending LeaveGroup request to coordinator kafka:9092 (id: 2147483646 rack: null) due to consumer poll timeout has expired.**

The root cause was:
- **max-poll-records was set to 500**
- **request.timeout.ms was 30,000 ms (30 seconds)**

In other words, if a consumer fails to process 500 messages within 30 seconds, the producer marks the request as failed, and the broker considers the consumer dead and removes it from the group.

This explains why, as shown in the figure, the number of active consumers dropped to zero.

To address this issue, we applied two solutions:
1. **Reduce the number of messages polled at a time (max-poll-records)**
2. **Increase request.timeout.ms**

Both solutions were applied successfully, preventing consumers from being removed prematurely.