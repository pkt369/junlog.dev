---
title:
  ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (3)"
  en: "Handling 2,000 TPS: Payment System (Part 3)"
excerpt:
  ko: "컨슈머 처리 최적화: 빠른 결제를 위한 커넥션 풀 & 샤딩"
  en: "Optimizing Consumer Processing: Connection Pooling & Sharding for Faster Checkout"
date: "2025-08-29"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Architecture", "Trafic", "Java", "Spring Boot", "Connection Pool", "Kafka", "Shading"]
slug: "payment-system-3"
---

[이전 포스팅](/blog/payment-system-2/) 에서는 비동기로 변환해 모든 요청을 drop 없이 처리할 수 있게 되었습니다.
하지만 컨슈머에서 시간이 엄청 오래걸리는 것을 보았습니다.

그 이유는 **데이터베이스 풀이 100개로 잡혀있었고 커넥션과 파티션을 500개로 잡아도 Hikari Pool 이 해당 설정을 못따라가는 것을 예측할 수 있었습니다.**
따라서 다음 테스트는 커넥션풀을 **500개**로 늘리고, 테스트를 해보았습니다.

<br>

# 커넥션 풀 늘리기
Postgres 는 100개가 Default 값이라 properties 에 500 이라 적어도 max-connection 이 정해져 있기때문에 늘어나지 않습니다.
참고) [docs.postgres.org](https://docs.postgrest.org/en/v12/references/connection_pool.html)
따라서 Postgres 데이터베이스에서 설정값을 변경해주어야 합니다.

<br>

변경하는 방법은 [Stackoverflow](https://stackoverflow.com/questions/30778015/how-to-increase-the-max-connections-in-postgres) 에서 확인했습니다. 저는 **max_connections** 변경과 함께 **shared_buffers, shm_size** 설정을 적용했습니다. (실서버에서는 PgBouncer를 사용하는 것이 더 효율적이라고 합니다.)

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

갑자기 CPU 사용률이 급등했지만, 곧바로 50% 수준으로 안정되었습니다.
Producer와 Consumer를 동시에 실행해서 발생한 현상으로 보이며, 둘을 분리하면 안정적으로 동작할 것으로 예상됩니다.

또한 k6 가 총 120,000개를 요청을 했고, 실패없이 요청된 것을 볼 수 있었습니다.

<br>

<img src="/payment-system-3/poll-500.png" alt="poll-500" align="center" />

기존에는 처리에 약 **30분**이 걸렸지만, 커넥션 풀을 늘린 후 약 **10분으로 단축**되었습니다.
하지만 **예상했던 5분**보다 시간이 더 걸리는 것을 확인했고 병목이 발생했다고 예측할 수 있었습니다.

즉, **단순히 커넥션 수를 늘리는 것만으로는 충분하지 않으며, 단일 DB의 내부 처리 능력(트랜잭션 처리, 락, 디스크 I/O 등)이 한계가 있어 추가적인 아키텍처 최적화가 필요하다고 느꼈습니다.**
따라서 지금 목표인 1분 이내 처리를 목표로 하기 때문에 샤딩과 같은 아키텍처 수준의 개선이 필수적임을 알 수 있었습니다.

<br>

# 샤딩
docker exec -it payment-citus-coordinator psql -U postgres -d payment_db
SELECT citus_set_coordinator_host('postgres-coordinator');

SELECT master_add_node('postgres-worker1', 5432);
SELECT master_add_node('postgres-worker2', 5432);
SELECT master_add_node('postgres-worker3', 5432);
SELECT master_add_node('postgres-worker4', 5432);
SELECT master_add_node('postgres-worker5', 5432);
이 포스팅은 결제 시스템의 대규모 데이터 처리를 위해 샤딩을 도입한 후 성능이 어떻게 개선되었는지, 그리고 상황에 맞는 기술 선택의 중요성에 초점을 맞췄습니다.

PostgreSQL과 Citus를 검토했지만, ARM64 맥북 환경에서의 지원 부족과 복잡한 설정 때문에 **CockroachDB를 선택**했습니다.
샤딩 후 결제 처리량을 비교하여, 전체 시간을 어떻게 줄였는지 알아보겠습니다.

## Code
[docker-compose.yml](https://github.com/pkt369/blog-payment-txn/blob/v3/docker-compose.yml) 에서 확인 할 수 있습니다.

좀 더 드라마틱한 성능 개선을 위해서 샤딩을 적용했습니다. 즉, 쓰기 디비를 늘려 더 줄여보았습니다.
이번 테스트의 목표는 1분이내로 잡아보겠습니다.


이전에는 500개로 잡았고, 예측한 시간은 4분이었지만 30분이 걸렸습니다.
  sysctls:
      kernel.shmmax: 8589934592
  
17:28 ~ 


# Trouble Shooting

docker exec -it payment-citus-coordinator bash

docker exec -it payment-citus-coordinator bash -c "echo 'postgres-worker1:5432:*:postgres:postgres
postgres-worker2:5432:*:postgres:postgres
postgres-worker3:5432:*:postgres:postgres
postgres-worker4:5432:*:postgres:postgres
postgres-worker5:5432:*:postgres:postgres' > ~/.pgpass && chmod 600 ~/.pgpass"


echo "postgres-worker5:5432:*:postgres:postgres" > ~/.pgpass
chmod 600 ~/.pgpass

---language-separator---