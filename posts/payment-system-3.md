---
title:
  ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (3)"
  en: "Handling 2,000 TPS: Payment System (Part 3)"
excerpt:
  ko: "컨슈머 처리 최적화: 빠른 결제를 위한 커넥션 풀 & 샤딩"
  en: "Optimizing Consumer Processing: Connection Pooling & Sharding for Faster Checkout"
date: "2025-10-03"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Architecture", "Traffic", "Java", "Spring Boot", "Connection Pool", "Kafka", "Sharding"]
slug: "payment-system-3"
---

[이전 포스팅](/blog/payment-system-2/) 에서는 비동기로 변환해 모든 요청을 drop 없이 처리할 수 있게 되었습니다.
하지만 컨슈머에서 시간이 엄청 오래걸리는 것을 보았습니다.

그 이유는 **커넥션과 파티션을 500개로 잡아도 데이터베이스 풀이 100개이기 때문에 컨슈머가 기다려야하는 이슈가 있었습니다.**
위 예측을 토대로 다음 테스트는 커넥션풀을 **500개**로 늘리고, 테스트를 해보았습니다.

<br>

# 커넥션 풀 늘리기
Postgres 는 100개가 Default 값이라 properties 에 500 이라 적어도 max-connection 이 정해져 있기때문에 늘어나지 않습니다.
참고) [docs.postgres.org](https://docs.postgrest.org/en/v12/references/connection_pool.html)

따라서 Postgres 데이터베이스에서 설정값을 변경하였습니다.

<br>

[Stackoverflow](https://stackoverflow.com/questions/30778015/how-to-increase-the-max-connections-in-postgres) 를 참고하여 **max_connections** 변경과 함께 **shared_buffers, shm_size** 설정을 적용했습니다. (실서버에서는 PgBouncer를 사용하는 것이 더 효율적이라고 합니다.)

shared_buffers 는 캐시 사용을 위한 메모리로, **시스템 메모리의 약 25%가 적당**하다고 합니다. 저는 나중에 샤딩을 생각하여 2G 를 적용하였습니다.

또한 shm_size는 도커의 공유 메모리를 의미하며, 캐시 메모리가 늘어남에 따라 shm_size도 증가시켜야 합니다. shm_size보다 작으면 도커 컨테이너가 정상적으로 실행되지 않습니다.

<br>

## Code
```yml
services:
  postgres:
    ...
    shm_size: '3gb'
    command: [ "postgres", "-c", "max_connections=500", "-c", "shared_buffers=2GB" ]
```

로 변경하였습니다.

<img src="/payment-system-3/after-configuration.png" alt="after-configuration" align="center" height="200"/>

<br>

## TPS 2000 테스트
이제 작은 숫자의 TPS 는 의미가 없을 것 같아 바로 TPS 2,000 으로 k6 를 이용해 테스트를 진행하였습니다.

<img src="/payment-system-3/resource-status.png" alt="resource-status" align="center" />
<img src="/payment-system-3/tps-2000-result.png" alt="tps-2000-result" align="center" />

CPU 사용률이 갑자기 급등했지만, 아직 최대치에 도달하지 않아 시스템은 안정적으로 보였습니다.

<br>

<img src="/payment-system-3/poll-500.png" alt="poll-500" align="center" />

기존에는 처리에 약 **30분**이 걸렸지만, 커넥션 풀을 늘린 후 약 **10분으로 단축**되었습니다.
하지만 **예상했던 5분**보다 시간이 더 걸리는 것을 확인했고 병목이 발생했다고 예측할 수 있었습니다.

즉, **단순히 커넥션 수를 늘리는 것만으로는 충분하지 않으며, 단일 DB의 내부 처리 능력(트랜잭션 처리, 락, 디스크 I/O 등)이 한계가 있어 추가적인 아키텍처 최적화가 필요하다고 느꼈습니다.**
따라서 지금 목표인 30초 이내 처리를 목표로 하기 때문에 샤딩과 같은 아키텍처 수준의 개선이 필수적임을 알 수 있었습니다.

<br>

# 샤딩
기존에는 Citus 로 진행을 했다가 Coordinator node 에서 병목 현상이 일어나 어플리케이션 레벨에서 진행하였습니다.

어플리케이션 레벨 샤딩의 핵심 코드는 아래와 같습니다.

```java
private static final ThreadLocal<String> contextHolder = new ThreadLocal<>();

public static void setShardKey(Long userId, int shardCount) {
    int shardId = (int)(userId % shardCount);
    contextHolder.set("db" + shardId);
}

@Override
protected Object determineCurrentLookupKey() {
    return contextHolder.get();
}
```
Thread 가 접근했을 때 **setShardKey 로 세팅하고 해당 데이터베이스를 가져와 진행**하는 방식입니다.

Transaction 을 위한 5개의 데이터베이스 + global database 조합으로 총 6개의 데이터베이스로 진행하였습니다.
전체 코드는 https://github.com/pkt369/blog-payment-txn/tree/v3 에서 확인 가능합니다.

<br>

## 테스트
좋은 결과를 위해서 파티션 1500개, 컨슈머 1500개로 늘렸고, 데이터베이스 6개로 테스트를 진행했습니다.
<img src="/payment-system-3/tps-2000-final.png" alt="tps-2000-final" align="center" />
<img src="/payment-system-3/final-test.png" alt="final-test" align="center" />

1분 25초가 걸렸고, 이 의미는 **맨 마지막 요청은 25초 정도**가 걸렸다는 것을 알 수 있습니다.
이전에는 10분 이상 걸리던 요청이 이제는 25초로 단축되면서 의미 있는 성과를 거둘 수 있었습니다.

다만 로컬 환경 특성상 몇 초 이내로 줄이는 데에는 한계가 있었습니다.  

특히 라운드 로빈이 고르게 동작하지 않아 특정 컨슈머에 부하가 몰리면서 `lag`(메시지 적체)가 발생했고,  
CPU 사용률도 가용 코어를 초과하면서 컨텍스트 스위칭, GC 지연, Disk I/O 경쟁 등으로 이어졌습니다.

<img src="/payment-system-3/partition.png" alt="partition" align="center" />
<img src="/payment-system-3/final-resource.png" alt="final-resource" align="center" />

즉, 성능을 더 줄이기 위해서는 **컨슈머 부하 분산과 리소스 확장이 필수적**인 것을 알 수 있었습니다.  
실서버 환경에서는 이러한 제약이 완화되므로, 수 초 이내의 결제 속도도 충분히 달성할 수 있을 것으로 기대됩니다.


<br>
<br>

# 정리
위 테스트를 통해, **물리적 자원이 부족하면 처리 속도가 느려질 수 있음**을 확인했습니다.
따라서 데이터베이스 커넥션 풀을 늘려 컨슈머의 처리 속도를 개선하였고, 단일 데이터베이스로는 성능 한계가 나타나 샤딩을 통해 쓰기 처리 능력을 분산시켜 30초 이내 처리를 달성할 수 있었습니다.

마지막으로 로컬 환경의 제한때문에 속도가 느릴 수 밖에 없었는데 실서버에서의 환경에서 훨씬 좋은 결과물을 만들 수 있을 것으로 예측됩니다.


<br>

# 마무리
이번 포스팅으로 결제 시스템 만들기 시리즈는 마무리하지만, 실제 서비스 환경에 적용하기에는 여전히 부족한 점이 있습니다.
예를 들어, 애플리케이션 샤딩을 진행하면서 읽기 성능이 저하되는 문제가 발생했습니다.
이 부분은 **읽기 트래픽에 강한 NoSQL 도입**이나 **쓰기/읽기 책임을 분리하는 CQRS 패턴**을 통해 개선할 수 있을 것으로 보입니다.

---language-separator---

In the [previous post](/blog/payment-system-2/), I converted the system to asynchronous processing so that all requests could be handled without being dropped.
However, I noticed that the consumers were taking an extremely long time to complete their work.

The reason was that **even with 500 connections and partitions, the database connection pool was limited to 100, forcing consumers to wait.**
Based on this observation, I ran the next test by increasing the connection pool to **500**.

<br>

# Increasing the Connection Pool
Postgres has a default limit of 100 connections, so even if you set the value to 500 in the properties, it will not increase unless the `max_connections` setting is explicitly configured in the database.

Reference) [docs.postgres.org](https://docs.postgrest.org/en/v12/references/connection_pool.html)

Therefore, I updated the configuration in PostgreSQL.

<br>

Referring to [Stackoverflow](https://stackoverflow.com/questions/30778015/how-to-increase-the-max-connections-in-postgres), I applied changes not only to **max_connections**, but also to **shared_buffers and shm_size**. (In a production environment, it’s generally more efficient to use PgBouncer.)

The shared_buffers parameter is the memory allocated for caching, and it is typically recommended to set it to about **25% of the system memory.** Since I was considering future sharding, I set it to 2GB.

The shm_size parameter defines the amount of shared memory available to the Docker container. As cache memory increases, shm_size must also be increased. If shm_size is set too low, the Docker container may fail to start properly.

<br>

## Code
```yml
services:
  postgres:
    ...
    shm_size: '3gb'
    command: [ "postgres", "-c", "max_connections=500", "-c", "shared_buffers=2GB" ]
```

I updated the configuration accordingly.

<img src="/payment-system-3/after-configuration.png" alt="after-configuration" align="center" height="200"/>

<br>

## Test TPS 2000
Since smaller TPS values are no longer meaningful, I ran the test directly at 2,000 TPS using k6.

<img src="/payment-system-3/resource-status.png" alt="resource-status" align="center" />
<img src="/payment-system-3/tps-2000-result.png" alt="tps-2000-result" align="center" />

The CPU usage suddenly spiked, but since it did not reach the maximum level, the system still appeared stable.

<br>

<img src="/payment-system-3/poll-500.png" alt="poll-500" align="center" />

Previously, processing took about **30 minutes**, but after increasing the connection pool, it was reduced to **around 10 minutes**.
However, since I expected it to finish in about **5 minutes**, the actual result revealed a performance bottleneck.

In other words, **simply increasing the connection pool was not enough. A single database has inherent limitations in transaction processing, locking, and disk I/O.** To achieve the target of under 30 seconds, architectural improvements such as sharding are essential.

<br>

# Sharding

Initially, I experimented with Citus for sharding, but the Coordinator node became a bottleneck.
As a result, I moved to application level sharding.

The key logic of this approach is shown below.

```java
private static final ThreadLocal<String> contextHolder = new ThreadLocal<>();

public static void setShardKey(Long userId, int shardCount) {
    int shardId = (int)(userId % shardCount);
    contextHolder.set("db" + shardId);
}

@Override
protected Object determineCurrentLookupKey() {
    return contextHolder.get();
}
```

When a thread accesses the repository, it uses **setShardKey to set the shard and then routes the query to the corresponding database.**

For transactions, I used a combination of **5 shard databases + 1 global database**, for a total of 6 databases.
The full code is available at: https://github.com/pkt369/blog-payment-txn/tree/v3.


<br>

## Test
For better results, I increased the setup to 1,500 partitions and 1,500 consumers, and ran the test with 6 databases.

<img src="/payment-system-3/tps-2000-final.png" alt="tps-2000-final" align="center" />
<img src="/payment-system-3/final-test.png" alt="final-test" align="center" />

The entire process took 1 minute and 25 seconds, which means that **the final request took about 25 seconds to complete.**
Compared to the previous tests where some requests took more than 10 minutes, reducing it to 25 seconds was a significant improvement.

However, due to the limitations of the local environment, it was not possible to reduce the time to just a few seconds.

In particular, round robin balancing did not work evenly, causing load to concentrate on certain consumers and resulting in lag (message backlog).
Additionally, CPU usage exceeded the available cores, leading to context switching overhead, GC delays, and Disk I/O contention, which further slowed processing.

<img src="/payment-system-3/partition.png" alt="partition" align="center" />
<img src="/payment-system-3/final-resource.png" alt="final-resource" align="center" />

In other words, **distributing consumer load and expanding resources are essential to further reduce processing time**.
In a production environment, these constraints would be alleviated, making it possible to achieve payment speeds within just a few seconds.

<br>
<br>

# Summary
Through this test, I confirmed that **insufficient physical resources can lead to slower processing speeds.**
By expanding the database connection pool, I was able to improve consumer throughput, and by applying sharding to overcome the limitations of a single database, I successfully achieved the target of processing within 30 seconds.

Due to the constraints of the local environment, the performance was naturally slower, but in a production setting, I expect much better results.

<br>

# Conclusion
This post marks the end of the Payment System series, but there are still limitations before it can be applied in a real production environment.
For example, while introducing application level sharding, read performance degradation occurred. This issue could be addressed by **adopting a NoSQL solution optimized for read heavy traffic**, or by applying a **CQRS pattern to separate read and write responsibilities.**