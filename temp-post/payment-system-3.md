---
title:
  ko: "초당 2,000건 트랜잭션을 견디는 결제 시스템 만들기 (3)"
  en: "Handling 2,000 TPS: Payment System (Part 3)"
excerpt:
  ko: "컨슈머 처리 최적화: 빠른 결제를 위한 커넥션 풀 & 샤딩"
  en: "Optimizing Consumer Processing: Connection Pooling & Sharding for Faster Checkout"
date: "2025-09-12"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Architecture", "Trafic", "Java", "Spring Boot", "Connection Pool", "Kafka", "Shading"]
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
샤딩은 citus 로 구현하였으며, 총 5개의 데이터베이스로 나누어 `user_id` 로 분리하여 넣었습니다.

## Code
[docker-compose.yml](https://github.com/pkt369/blog-payment-txn/blob/v3/docker-compose.yml) 에서 확인 할 수 있습니다.

docker compose up -d 를 명령어를 이용해 실행시키고 다음과 같이 메인 노드와 샤딩된 노드들을 이어주어야 합니다.

```sql
docker exec -it payment-citus-coordinator bash

cd /var/lib/postgresql

echo "postgres-worker1:5432:*:postgres:postgres" >> ~/.pgpass
echo "postgres-worker2:5432:*:postgres:postgres" >> ~/.pgpass
echo "postgres-worker3:5432:*:postgres:postgres" >> ~/.pgpass
echo "postgres-worker4:5432:*:postgres:postgres" >> ~/.pgpass
echo "postgres-worker5:5432:*:postgres:postgres" >> ~/.pgpass

-- PostgreSQL 이 0600이 아니면 무시함
chmod 0600 ~/.pgpass

-- 도커에서 나와 테스트
docker exec -it payment-citus-coordinator psql -U postgres -d payment_db -h postgres-worker1 -c "SELECT 1;"
```
위 테스트에서 비밀번호가 없이 성공한다면 연결이 된 것 입니다.

이제 코디네이터 노드에서 클러스터 설정을 해줍니다.

```sql
docker exec -it payment-citus-coordinator psql -U postgres -d payment_db

SELECT citus_set_coordinator_host('postgres-coordinator', 5432);

SELECT citus_add_node('postgres-worker1', 5432);
SELECT citus_add_node('postgres-worker2', 5432);
SELECT citus_add_node('postgres-worker3', 5432);
SELECT citus_add_node('postgres-worker4', 5432);
SELECT citus_add_node('postgres-worker5', 5432);

SELECT * FROM pg_dist_node;
SELECT * FROM citus_get_active_worker_nodes();
```

<br>

## 테스트
### 1차
5개 데이터베이스로 늘렸고, 컨슈머는 이전처럼 500으로 고정시켰습니다.
<img src="/payment-system-3/tps-2000-1.png" alt="tps-2000-1" align="center" />
<img src="/payment-system-3/tps-2000-1-success.png" alt="tps-2000-1-success" align="center" />

성공적으로 모든 테스트가 끝났지만, **시간은 약 10분으로 이전과 비슷함을 볼 수 있었습니다.**
예측했던 것과 달리 성능이 비슷하여 파티션과 컨슈머를 좀더 늘려서 테스트를 해보았습니다.

<br>

### 2차
이번에는 **컨슈머 수와 파티션의 수를 1500개**로 늘려 테스트를 진행하였습니다.
하지만 생각보다 오래걸렸고 **9분 21초**가 나왔습니다. 분석해보니 **200개부터 오래걸렸었는데 하나의 컨슈머가 처리 속도가 늦어 Hot Partition 가 일어난 문제**였습니다.
확인해보니 실제 서버와 다르게 1분동안만 받다보니 파티션에 어떤건 0개, 어떤건 400개로 크게 불균형이 일어나 생긴 문제로 보였습니다.

<br>

### 3차
위에서 겪은 것을 토대로 아래 옵션을 properties 에 추가하였습니다.
`spring.kafka.producer.properties.partitioner.class=org.apache.kafka.clients.producer.RoundRobinPartitioner`
이 옵션을 추가하고 나서 0개인 파티션이 없어지고, 150개가 최대로 된 것을 볼 수 있었습니다.

<img src="/payment-system-3/final-test.png" alt="final-test" align="center" />

드디어 예측한대로 **5분 이내**로 나왔습니다.

<br>

# 정리
위 테스트를 통해, 물리적 자원이 부족하면 처리 속도가 느려질 수 있음을 확인했습니다.
따라서 데이터베이스 커넥션 풀을 늘려 컨슈머의 처리 속도를 개선하였고, 단일 데이터베이스로는 성능 한계가 나타나 샤딩을 통해 쓰기 처리 능력을 분산시켜 5분 이내 처리를 달성할 수 있었습니다.

---language-separator---