

```java
private User createTestUser() {
    User user = User.builder()
            .discordId("test-discord-id-" + System.currentTimeMillis())
            .username("testuser")
            .avatarUrl("https://example.com/avatar.png")
            .email("test@example.com")
            .build();

    Long userIdx = userRepository.add(user);
    JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
    List<Map<String, Object>> rows = jdbcTemplate.queryForList(
        "SELECT * FROM user WHERE id = ?", userIdx
    );
    System.out.println("Jdbc Rows: " + rows);
    System.out.println("userIdx: " + userIdx);
    user.setUserIdx(userIdx);
    return user;
}

```

왜 @Transactional 삭제로 해결됨?:
@Transactional을 제거하면 MyBatis의 SqlSession이 Spring의 트랜잭션 관리 없이 독립적으로 동작. 즉, userRepository.add(user)로 실행된 INSERT 쿼리가 즉시 데이터베이스에 커밋됨.
이후 userRepository.findByUserIdx(userIdx)가 새로운 SqlSession 또는 동일 세션에서 데이터를 조회하므로, 삽입된 데이터가 정상적으로 반환됨.
멀티 테스트에서 @Transactional 사용 시, Spring이 트랜잭션별로 SqlSession을 관리하며 커밋을 지연시키거나, 데이터 소스 연결 풀에서 예상치 못한 동작(예: 다른 연결 사용, 세션 캐시 문제)이 발생해 데이터가 조회되지 않을 가능성이 있음.
세부 원인 가설:
SqlSession 관리 문제:
Spring의 @Transactional은 MyBatis의 SqlSession을 트랜잭션에 바인딩. 멀티 테스트에서 여러 트랜잭션이 동시에 실행되며 SqlSession이 제대로 플러시(flush)되지 않거나, 잘못된 연결을 사용해 삽입 데이터가 조회에 반영되지 않음.
@Transactional 제거 시, MyBatis가 기본적으로 자동 커밋 모드로 동작하거나 새로운 SqlSession을 사용해 즉시 커밋됨.
데이터 소스 연결 풀 문제:
테스트 환경에서 HikariCP 같은 연결 풀이 사용되면, 멀티 테스트에서 연결이 재사용되거나 트랜잭션별로 다른 연결을 사용해 데이터 일관성이 깨질 수 있음.
예: userRepository.add(user)가 한 연결에서 실행되고, findByUserIdx(userIdx)가 다른 연결에서 실행되며, 트랜잭션 격리 수준(예: READ_COMMITTED)에 따라 아직 커밋되지 않은 데이터를 보지 못함.
트랜잭션 격리 수준:
데이터베이스의 격리 수준이 READ_COMMITTED 이상이라면, 트랜잭션 내에서 삽입된 데이터가 커밋 전까지 동일 트랜잭션 외부에서 보이지 않을 수 있음. 하지만 동일 트랜잭션 내에서는 보통 보이므로, 이 문제는 덜 가능성 있음.
결론:
@Transactional을 삭제하면 MyBatis가 트랜잭션 없이 즉시 커밋하므로, userRepository.add(user)로 삽입된 데이터가 데이터베이스에 즉시 반영되고, findByUserIdx(userIdx)가 이를 정상적으로 조회함. 멀티 테스트에서 @Transactional 사용 시, Spring의 트랜잭션 관리와 MyBatis의 SqlSession 간 불일치로 인해 삽입 데이터가 조회 시점에 반영되지 않아 null이 반환된 것임.

2. @Transactional 삭제 시 롤백 문제
@Transactional을 삭제하면 테스트 메서드 실행 후 데이터베이스 변경 사항이 롤백되지 않습니다. 이는 테스트의 독립성을 해칠 수 있으며, 특히 멀티 테스트에서 데이터베이스 상태 간섭을 유발할 수 있습니다.

롤백이 필요한 이유:
테스트는 독립적이어야 하며, 한 테스트의 데이터베이스 변경 사항이 다른 테스트에 영향을 주지 않아야 함.
@Transactional과 @Rollback(true)(또는 기본 롤백 동작)을 사용하면, 테스트 메서드 종료 후 데이터베이스 변경 사항(예: tb_user에 삽입된 데이터)이 롤백되어 다음 테스트가 깨끗한 상태에서 시작됨.
@Transactional을 제거하면 userRepository.add(user)로 삽입된 데이터가 데이터베이스에 영구적으로 저장되고, 후속 테스트에서 tb_user 테이블에 남아 있는 데이터가 간섭을 일으킬 수 있음(예: 유니크 제약 위반, AUTO_INCREMENT 값 변경).
영향:
init.sql이 테이블 생성만 하고 데이터 삽입은 없으므로, @Transactional 없이 테스트를 실행하면 createTestUser()가 삽입한 User 데이터가 tb_user 테이블에 남음.
후속 테스트에서 동일한 discord_id나 email로 삽입하려 하면 유니크 제약 위반이 발생할 수 있음.
AUTO_INCREMENT 값이 증가해, 테스트마다 다른 userIdx가 생성되어 예측 불가능한 동작 가능.


```java
@BeforeEach
void clearDatabase() {
    jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");
    jdbcTemplate.execute("TRUNCATE TABLE user");
    jdbcTemplate.execute("TRUNCATE TABLE board");
    jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");
    jdbcTemplate.execute("ALTER TABLE user AUTO_INCREMENT = 1");
    jdbcTemplate.execute("ALTER TABLE board AUTO_INCREMENT = 1");
}
```