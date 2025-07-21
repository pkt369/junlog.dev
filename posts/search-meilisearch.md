---
title:
  ko: "MeiliSearch 사용 후기: 적은 메모리로 검색 기능 구현하기"
  en: "Our MeiliSearch Experience: Building Fast Search on Low-Memory Servers"
excerpt:
  ko: "한글을 지원하는 MeiliSearch 로 적은 메모리로 검색을 구현한 후기"
  en: "Building a Korean-Capable Search System with MeiliSearch on a Low-Memory Server"
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
<br>

또한 VPS 라는 제한적인 환경에서 <b>Frontend + Backend + Database</b> 와 함께 사용을 하고 있습니다.
그리고 저희는 <b>로깅으로 Vector + Clickhouse + Grafana 조합</b>으로 로깅을 사용하고 있었는데 이미 오버 메모리로 더 이상 무언가 새로운 것을 추가하기가 어려웠습니다.

<img src="/search-meilisearch/top.png" alt="search" align="center" />

<br>

그래서 고민끝에 다음과 같은 선택지를 고민하였습니다.

1. <b>Mysql 를 내부 데이터베이스로 사용하고 있었는데 Postgresql 로 데이터베이스를 변경해서 검색을 지원하는 방법.</b>
물론 Mysql 도 FullTextSearch 를 지원하지만 <b>인덱싱과 Ranking 을 따로 지원하지 않아</b>서 검색에 불리하다고 생각했습니다.
하지만 Postgres 에는 Ranking 시스템이 존재하고 이전 프로젝트에서 검색 기능으로 사용한 경험이 있어서 후보로 생각했습니다.

2. <b>MeiliSearch 사용하기</b>
지금 현재 VPS 환경에서 MeiliSearch 를 사용하기 위해서는 충분한 메모리가 필요한데 이 조건을 충족하지 않아 고민을 많이하게 만들었습니다.
하지만 현재 만들어진 좋은 Stack 을 이용하면 손쉽게 검색 기능을 이용 할 수 있을 거라고 생각했습니다.
또한 한글까지 지원하여 모든 부분이 적절했습니다.

<br>

그래서 결국 선택은 2번인 <b>MeiliSearch</b> 를 생각하게 되었습니다.
하지만 위에서 말했듯이 사용할려면 충분한 메모리가 필요하여 <b>로깅 스택을 삭제</b>하기로 하였습니다.

<br>

하지만 에러를 확인하는 것은 매우 중요한 일임으로 다음과 같이 작업하였습니다.
- 기존 그라파나에서 에러를 받고 알람으로 주던 부분을 <b>스프링 부트에서 직접 에러</b>를 날려주기로 했습니다.
- 에러 로깅은 VPS 환경에 <b>직접 접근</b>하여 tail 등 명령어로 에러를 체크하기로 했습니다.
- 기존 로깅들은 30일 주기로 Rolling 을 통해서 관리해주기로 했습니다. 
    - 이전에는 클릭하우스에 로깅을 저장하고 있어서 3일주기로 로그 파일을 삭제하고 있었습니다.

위와 같이 작업한 결과 로깅 서버에서 많이 사용하던 메모리를 없애고, MeiliSearch 를 사용할 수 있게 되었습니다. 

<br>

>> 왜 Elestic Search 같이 좀더 유명한 Stack 이 있는데 사용하지 않았나요?
Elestic Search 는 자바로 만들어져 메모리를 2-4 GB 정도 사용하여 서버에 무리가 갈 수 있다고 생각하였습니다.
최대한 메모리를 적게 사용하는 검색 기능이 필요했고, 500 MB 정도를 사용하는 MeiliSearch 였습니다.

<br>

# 설계
MeiliSearch 에서는 테이블 같이 <b>저장할 수 있는 영역을 Indexing</b> 라고 지칭합니다. 이부분을 만들어야하는데 고민끝에 통합인덱스 하나로 모든 검색을 지원하기로 하였습니다.
대신에 <b>type 을 만들어 특정 type 을 검색</b>할 수 있도록 생각하였습니다.

따라서 아래와 같이 설계를 했습니다.
- <b>id</b>: "type:index" 로 유니크하게 만듦, 만약 중복되서 insert 될 경우 덮어 씀
- <b>type</b>: "hero" 같이 실제 타입
- <b>title</b>: 메인 (점수 제일 높음)
- <b>description</b>: 서브, title 을 제외한 검색을 위한 데이터는 여기에 들어가게 됨
- <b>url</b>: Redirect url
- <b>createdAt</b>


<br>


# 작업 과정
먼저 작업은 도커로 진행되었으며, https://www.meilisearch.com/ 를 참고하여 진행하였습니다.

## 도커
먼저 도커는 docker compose 를 사용했고, 파일은 다음과 같습니다.

```yml
services:
  meilisearch:
    image: getmeili/meilisearch:v1.15
    container_name: meilisearch
    environment:
      - MEILI_MASTER_KEY=<secret key>
    ports:
      - "7700:7700"
    volumes:
      - ./meili_data:/meili_data
    restart: unless-stopped
```

## Create Index
그다음으로 index 를 만들어줘야 합니다.
저의 경우 docker 로 직접 접근하여 컨테이너 내부에서 명령어를 통해 실행하였습니다.

```bash
docker exec -it meilisearch /bin/bash
```

이 다음에는 init_meilisearch.sh 를 만들어 실행시켜주었습니다만 직접 curl 실행해도 아무 문제 없습니다.

```bash
#!/bin/bash

# 설정값
MEILI_URL=http://localhost:7700
MEILI_API_KEY=your_api_key_here

# 1. 인덱스 생성
curl -X POST "$MEILI_URL/indexes" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $MEILI_API_KEY" \
     --data '{
       "uid": "contents",
       "primaryKey": "id"
     }'

# 2. filterableAttributes 설정
curl -X PATCH "$MEILI_URL/indexes/contents/settings/filterable-attributes" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $MEILI_API_KEY" \
     --data '["type"]'

# 3. searchableAttributes 설정
curl -X PATCH "$MEILI_URL/indexes/contents/settings/searchable-attributes" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $MEILI_API_KEY" \
     --data '["title", "description"]'

echo "✅ MeiliSearch 초기화 완료!"
```

1. 인덱스 작업은 테이블 같은 개념으로 저장할 데이터를 만드는 작업입니다.
2. MeiliSearch 에서 filiter 를 사용하기 위해 미리 설정을 해두는 작업입니다.
3. 검색을 할때 어떤 데이터에서 찾을 것인지 설정하는 부분입니다.

<br>

## 코드 작업
먼저 저는 <b>Handler</b> 라는 구조를 추가하여 <b>Controller -> Handler -> Service -> Repository</b> 로 나누었습니다.
그 이유는 MeiliSearchService 를 추가적으로 사용해야 하는데 Service 에서 Service 를 호출하는 부분은 <b>일관성이 깨지게 되기 때문입니다.</b>
따라서 Handler 를 만들어 여러 Service 를 호출하여 사용하였습니다.

### Gradle
먼저 Gradle 에 다음과 같이 추가하여 사용하였습니다.
참고) https://github.com/meilisearch/meilisearch-java

```gradle
implementation 'com.meilisearch.sdk:meilisearch-java:0.15.0'
```

### 공통 클래스
먼저 공식 라이브러리를 사용하기 위해서 아래와 같이 설정해두었습니다.

```java
@Configuration
@Profile("!test")
public class MeiliSearchConfig {

    @Value("${meilisearch.apiKey}")
    private String meiliApiKey;

    @Value("${meilisearch.host}")
    private String meiliHost;

    @Bean
    public Client meiliSearchClient() {
        return new Client(
            new Config(meiliHost, meiliApiKey)
        );
    }
}
```

또한 위에서 제가 정의한대로 공통 클래스를 만들어 사용하여 타입 에러를 없앴습니다.

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SearchDocument {
    private String id;
    private String type;
    private String title;
    private String description;
    private String url;
    private String createdAt;
}
```

### MeiliSearchService
먼저 모든 기능을 담당하는 MeiliSearchService 를 작업을 진행하였습니다.

```java
@Service
@RequiredArgsConstructor
public class MeiliSearchService {

    private final Client meiliClient;
    private final ObjectMapper objectMapper;

    public TaskInfo addOrUpdateDocument(SearchDocument document) {
        try {
            Index index = meiliClient.index("contents");
            String json = objectMapper.writeValueAsString(List.of(document));
            return index.addDocuments(json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to add/update document", e);
        }
    }

    public TaskInfo deleteDocument(String id) {
        try {
            Index index = meiliClient.index("contents");
            return index.deleteDocument(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete document", e);
        }
    }

    public SearchResultPaginated search(String query, String type, int page, int hitsPerPage) {
        Searchable result = meiliClient.index("contents")
            .search(new SearchRequest(query)
                .setPage(page)
                .setHitsPerPage(hitsPerPage)
                .setFilter(new String[]{"type=\"" + type + "\""})
            );

        if (result instanceof SearchResultPaginated paginated) {
            return paginated;
        }
        throw new IllegalStateException("Expected paginated search result, but got: " + result.getClass().getSimpleName());
    }

    public SearchResultPaginated search(String query, int page, int hitsPerPage) {
        Searchable result = meiliClient.index("contents")
            .search(new SearchRequest(query)
                .setPage(page)
                .setHitsPerPage(hitsPerPage)
            );

        if (result instanceof SearchResultPaginated paginated) {
            return paginated;
        }
        throw new IllegalStateException("Expected paginated search result, but got: " + result.getClass().getSimpleName());
    }

    public TaskInfo removeByType(String type) {
        String filter = String.format("type = '%s'", type);
        return meiliClient.index("contents").deleteDocumentsByFilter(filter);
    }

    public void waitForTask(TaskInfo taskInfo) throws InterruptedException {
        int taskUid = taskInfo.getTaskUid();
        while (true) {
            Task task = meiliClient.getTask(taskUid);
            String taskStatus = task.getStatus().taskStatus;

            System.out.println(taskStatus);
            if ("succeeded".equals(taskStatus)) {
                break;
            } else if ("failed".equals(taskStatus)) {
                throw new RuntimeException("Meilisearch task failed: " + task);
            }

            Thread.sleep(200); // 200ms polling
        }
    }
}
```

CURD 작업과 waitForTask 라는 함수가 보입니다. 여기서 눈여겨 봐야할 곳은 먼저 <b>Pagination</b> 입니다.
위에서 MeiliSearch 에서는 페이지네이션을 2가지 버전으로 제공하는데
1. offset, limit
2. page, hitsPerPage

이렇게 제공합니다.
저는 page, hitsPerPage 를 사용하였습니다.

<br>

또한 <b>Searchable</b> 를 반환해주는데 page, hitsPerPage 의 경우에는 <b>SearchResultPaginated</b> 를 반환해주어 instanceof 를 통해 return 을 하였습니다.
더 자세한 부분은 https://www.meilisearch.com/docs/reference/api/search 여기를 보시면 알 수 있습니다.

<br>

다음으로 눈여겨 봐야할 곳이 waitForTask 인데 이 함수는 마이그레이션을 위해 존재하는 함수입니다.
저의 경우 이미 어느정도 데이터가 쌓인 뒤라 한번에 데이터를 옮기는 마이그레이션 작업이 필요하여 작성하였습니다.
이부분은 좀더 뒤에서 다루겠습니다.

<br>

### Handler 
하나의 예시를 가져와서 설명하겠습니다.

```java
public void addPost(GuildPost post, Long userIdx) {
    UserInfo userInfo = userService.findByUserIdx(userIdx);
    guildService.addPost(post);
    
    SearchDocument searchDocument = createSearchDocument(post, userInfo);
    try {
        TaskInfo result = meiliSearchService.addOrUpdateDocument(searchDocument);
        log.info("Post guild-{} added to search index successfully with task {}", post.getPostIdx(), result.getTaskUid());
    } catch (Exception e) {
        log.error("Failed to add post guild-{} to search index: {}", post.getPostIdx(), e.getMessage());
    }
}

public void updatePost(GuildPost post, Long userIdx) {
    UserInfo userInfo = userService.findByUserIdx(userIdx);
    guildService.updatePost(post, userIdx);

    SearchDocument searchDocument = createSearchDocument(post, userInfo);
    try {
        TaskInfo result = meiliSearchService.addOrUpdateDocument(searchDocument);
        log.info("Post guild-{} updated in search index successfully with task {}", post.getPostIdx(), result.getTaskUid());
    } catch (Exception e) {
        log.error("Failed to update post guild-{} in search index: {}", post.getPostIdx(), e.getMessage());
    }
}

public void removePost(long postIdx, long userIdx) {
    guildService.removePost(postIdx, userIdx);
    try {
        TaskInfo result = meiliSearchService.deleteDocument("guild-" + postIdx);
        log.info("Post guild-{} removed from search index successfully with task {}", postIdx, result.getTaskUid());
    } catch (Exception e) {
        log.error("Failed to remove post guild-{} from search index: {}", postIdx, e.getMessage());
    }
}

private SearchDocument createSearchDocument(GuildPost post, UserInfo userInfo) {
    GuildDocumentDto guildDocumentDto = GuildDocumentDto.fromDomain(post, userInfo);
    return SearchDocument
        .builder()
        .id("guild-" + post.getPostIdx())
        .type("guild")
        .title(post.getPostTitle() != null ? post.getPostTitle() : "")
        .description(guildDocumentDto.toDescription())
        .url("/guild/" + post.getPostIdx())
        .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
        .build();
}
```

Handler 에서 핵심 함수들만 추려와서 넣은 코드들이고, logging 부분은 없애고 사용하시면 될 것 같습니다.
저희의 경우 모든 함수들이 잘 적용되는지 체크하기 위해 넣고 진행중인데 리팩토링 시 없앨 예정입니다.

<br>

<b>정리하면 검색에 필요한 데이터를 Title, Description 에 사용중이고, 검색시 Filiter 를 통해 해당 타입을 포함한 검색을 하는 것을 볼 수 있습니다.</b>

<img src="/search-meilisearch/search.png" alt="search" align="center" />

<br>

## 마이그레이션
처음부터 데이터가 들어가있지 않다면 분명히 마이그레이션 작업이 필요할 것입니다.
저는 마이그레이션 전용 Service 를 만들어 진행하였습니다.

### MigrationService

```java
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "migration.guild.enabled", havingValue = "true")
public class GuildMigrationService implements CommandLineRunner {

    private final GuildService guildService;
    private final GuildHandler guildHandler;
    private final UserService userService;

    private static final int BATCH_SIZE = 50;
    private final MeiliSearchService meiliSearchService;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting guild migration to MeiliSearch...");
        
        try {
            migrateGuildPosts();
            log.info("Guild migration completed successfully");
        } catch (Exception e) {
            log.error("Guild migration failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    private void migrateGuildPosts() throws InterruptedException {
        log.info("Remove all Guild data from MeiliSearch...");
        TaskInfo taskInfo = meiliSearchService.removeByType("guild");
        meiliSearchService.waitForTask(taskInfo);

        log.info("Fetching all guild posts from database...");
        
        int page = 1;
        int totalMigrated = 0;
        
        while (true) {
            List<GuildPost> posts = guildService.findAllPosts(BATCH_SIZE, page);
            
            if (posts.isEmpty()) {
                break;
            }
            
            log.info("Processing batch {} with {} guild posts", page, posts.size());
            
            for (GuildPost post : posts) {
                try {
                    UserInfo userInfo = userService.findByUserIdx(post.getUserIdx());
                    guildHandler.addGuildPostToSearchIndex(post, userInfo);
                    totalMigrated++;
                    
                    if (totalMigrated % 10 == 0) {
                        log.info("Migrated {} guild posts so far...", totalMigrated);
                    }
                } catch (Exception e) {
                    log.error("Failed to migrate guild post {} ({}): {}", 
                        post.getPostIdx(), post.getPostTitle(), e.getMessage());
                }
            }
            page++;
        }
        
        log.info("Migration completed. Total guild posts migrated: {}", totalMigrated);
    }
}
```

위와 같이 작업을 완료하였습니다. 여기서 <b>removeType 을 통해 전체를 삭제하고 생성하게 되는데 삭제가 즉시 일어나지 않기때문에 위에서 언급했던 waitForTask(taskInfo) 를 통해 기다리고 완벽히 삭제가 된 다음 생성 작업을 이어가게 됩니다.</b>

또 이제 봐야할 곳은 `@ConditionalOnProperty(name = "migration.guild.enabled", havingValue = "true")` 이부분인데, application.yml 에서 

```yml
migration:
  guild:
    enabled: false
```
이 부분이 <b>true 로 설정하고 서버 실행</b>시 마이그레이션이 같이 실행되게 됩니다.

<br>

# 테스트
저는 코드를 만들고 나서 정말 잘 동작하는지, 그리고 에러는 발생하지 않는지 알기위해 <b>통합테스트</b>를 하나 만들었습니다.
너무 많은 내용을 작성하였기 때문에 짧게 공유하도록 하겠습니다.

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@Sql(scripts = "/init.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
@Import(IntegratedMockConfig.class)
@Rollback(true)
class GuildControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MeiliSearchService meiliSearchService;

    @Autowired
    private UserService userService;

    @Autowired
    private GuildRepository guildRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private Client meiliClient;

    @Container
    static GenericContainer<?> meilisearchContainer = new GenericContainer<>(
        DockerImageName.parse("getmeili/meilisearch:v1.15"))
        .withExposedPorts(7700)
        .withEnv("MEILI_MASTER_KEY", "test-master-key")
        .withEnv("MEILI_ENV", "development")
        .withStartupTimeout(Duration.ofMinutes(2));

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (!meilisearchContainer.isRunning()) {
            meilisearchContainer.start();
        }

        String meilisearchUrl = "http://localhost:" + meilisearchContainer.getMappedPort(7700);
        registry.add("meilisearch.host", () -> meilisearchUrl);
        registry.add("meilisearch.apiKey", () -> "test-master-key");
    }

    @BeforeEach()
    void setUp() {
        meiliClient.createIndex("contents", "id");
        meiliClient.index("contents").updateFilterableAttributesSettings(new String[]{"type"});
        meiliClient.index("contents").updateSearchableAttributesSettings(new String[]{"title", "description"});
    }


    @Test
    void 길드_등록_테스트() throws Exception {
        User user = createUser();

        GuildPost guildPost = GuildPost.builder()
            ...
            .build();

        String json = objectMapper.writeValueAsString(guildPost);

        ResultActions result = mockMvc.perform(post("/api/guild")
            .contentType(MediaType.APPLICATION_JSON)
            .cookie(new Cookie("access_token", <token>))
            .content(json));

        result.andExpect(status().isCreated());
        result.andExpect(jsonPath("$.message").value("Success"));

        //DB
        ...
        List<GuildPost> postAll = guildRepository.findPostAll(condition);
        assertEquals(1, postAll.size());
        assertEquals("New Guild", postAll.getFirst().getPostTitle());

        // 동기화 이슈로 인한 대기 필요
        Thread.sleep(500);

        //MeiliSearch
        SearchResultPaginated search = meiliSearchService.search("New Guild", "guild", 1, 10);
        System.out.println(search);
        assertNotEquals(0, search.getHits().size());
        assertEquals(search.getHits().getFirst().get("title"), "New Guild");
    }
```

위와 같이 <b>TestContainer 를 통해서 임시 도커로 MeiliSearch 를 띄워 실행</b>했고, 성공적으로 테스트가 성공하는 것을 볼 수 있었습니다.

<br>

# 정리
MeiliSearch 를 사용함에 따라 검색기능이 대폭 상승하였고, 속도도 빠르게 받아 볼 수 있었습니다.
또한 VPS 를 사용하는 환경이라면 제한적인 메모리를 사용해야하는데 메모리를 적게 사용하는 MeiliSearch 가 적합하다고 생각하였습니다.

또한 한글 형태소, Ranking 기준 설정 등등 많은 부분을 지원하여 부족함없이 기능을 설정할 수 있어 매우 만족하였습니다.


---language-separator---


# The reason I used MeiliSearch
Recently, I started working on a new project called [Senagg](https://sena.gg) with some friends, and I was responsible for implementing the search feature.
Our environment was hosted on a VPS, and since it’s a Korean-speaking community, we needed to support Korean morphology as well.
<br>

Since we were using a VPS, we had to deal with memory limitations.
Our stack already included the frontend, backend, database (MySQL), and a logging system built with Vector, Clickhouse, and Grafana.

Because of that, the system was already using most of the available memory, and we couldn’t afford to add any additional services.

<img src="/search-meilisearch/top.png" alt="search" align="center" />

<br>

So we started to consider better options for search functionality.

1. <b>Switching from MySQL to PostgreSQL for internal database</b>
We were originally using MySQL as our main database, but we considered switching to PostgreSQL to improve search capabilities.
Although <b>MySQL does support Full-Text Search, it lacks proper indexing and ranking features</b>, which made it less suitable for our needs.
On the other hand, PostgreSQL offers <b>GIN indexing and ranking support</b>, and since I had experience using it in previous projects, it seemed like a strong candidate.

2. <b>Implementing MeiliSearch</b>
We also considered using MeiliSearch, which is a modern search stack that is <b>easy to integrate and supports Korean out of the box.</b>
However, since we’re currently hosting everything on a limited VPS environment, memory constraints made it difficult to adopt MeiliSearch right away.
Despite the challenges, we believe MeiliSearch offers an excellent search experience, and it’s definitely something we’d like to use in the future.

<br>

So we decided to go with option 2, which is MeiliSearch.
However, as I mentioned earlier, we didn’t have enough memory to implement it properly, so we decided to <b>remove the logging stack</b> to free up resources.

<br>

However, since error monitoring is critical, we made the following changes:
- Instead of relying on Grafana alerts, <b>we now send error messages directly from the Spring Boot server.</b>
- We manually check logs using commands like tail by <b>directly accessing</b> our VPS environment.
- We manage basic logging with Logback’s rolling policy, retaining logs for up to 30 days.
  - Previously, logs were stored in ClickHouse and automatically deleted every 3 days.

As a result of these changes, we were able to free up a significant amount of memory previously consumed by the logging stack, which allowed us to introduce MeiliSearch. 

<br>

>> Q: Why didn’t you choose a more popular stack like Elasticsearch?
Elasticsearch is built with Java and typically consumes around 2–4 GB of memory, which we found to be too heavy for our server environment.
Since minimizing memory usage was a key requirement for us, we chose MeiliSearch instead, which only requires around 500 MB.

<br>

# Design
In MeiliSearch, an <b>index is like a table in a database where data is stored.</b>
We needed to create this, and after some discussion, we decided to use a <b>unified index</b> that included all types of data.
To support filtering, we added a <b>type field</b> to each document so searches could be narrowed down by type.

<br>

So we designed the document structure as follows:
- <b>id</b>: Uniquely generated using "type:index". If a duplicate is inserted, it will be overwritten.
- <b>type</b>: The actual data type, such as "hero".
- <b>title</b>: Main field, given the highest search score.
- <b>description</b>: Sub field. All searchable data except the title goes here.
- <b>url</b>: Redirect URL.
- <b>createdAt</b>: Timestamp for creation.

<br>

# Working process
We implemented MeiliSearch using Docker and referred to [MeiliSearch’s official website](https://www.meilisearch.com/) for guidance.

## Docker
We used Docker Compose, and the configuration file is as follows:

```yml
services:
  meilisearch:
    image: getmeili/meilisearch:v1.15
    container_name: meilisearch
    environment:
      - MEILI_MASTER_KEY=<secret key>
    ports:
      - "7700:7700"
    volumes:
      - ./meili_data:/meili_data
    restart: unless-stopped
```

## Create Index
Now we need to create the index.
In my case, I accessed the Docker container directly and ran the command inside it.

```bash
docker exec -it meilisearch /bin/bash
```

The next step was to create and run an init_meilisearch.sh script.
However, you can also run the commands directly using curl.

```bash
#!/bin/bash

# configuration
MEILI_URL=http://localhost:7700
MEILI_API_KEY=your_api_key_here

# 1. create the index
curl -X POST "$MEILI_URL/indexes" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $MEILI_API_KEY" \
     --data '{
       "uid": "contents",
       "primaryKey": "id"
     }'

# 2. configure the filterableAttributes
curl -X PATCH "$MEILI_URL/indexes/contents/settings/filterable-attributes" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $MEILI_API_KEY" \
     --data '["type"]'

# 3. configure the searchableAttributes
curl -X PATCH "$MEILI_URL/indexes/contents/settings/searchable-attributes" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $MEILI_API_KEY" \
     --data '["title", "description"]'

echo "✅ Complete MeiliSearch init!"
```

1. Creating an index is like creating a table in a traditional database to store data.
2. In MeiliSearch, we need to set up filters in advance.
3. When performing a search, MeiliSearch uses these filters to determine which data to look through.

<br>

## Working with Codebase
I added a <b>Handler layer</b> to separate responsibilities as follows:
<b>Controller -> Handler -> Service -> Repository.</b>
This was necessary because we needed to add MeiliSearchService, and calling one service from another would <b>break consistency.</b>
By introducing a Handler, we can coordinate calls to multiple services in a clean and consistent way.

### Gradle
We added the following dependency to our Gradle setup:
Reference) https://github.com/meilisearch/meilisearch-java

```gradle
implementation 'com.meilisearch.sdk:meilisearch-java:0.15.0'
```

### Common Class
We created a class to use the official library as follows.

```java
@Configuration
@Profile("!test")
public class MeiliSearchConfig {

    @Value("${meilisearch.apiKey}")
    private String meiliApiKey;

    @Value("${meilisearch.host}")
    private String meiliHost;

    @Bean
    public Client meiliSearchClient() {
        return new Client(
            new Config(meiliHost, meiliApiKey)
        );
    }
}
```

You should set up the configuration in application.yml.
Based on the structure we defined earlier, we created a common class to eliminate type errors.

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SearchDocument {
    private String id;
    private String type;
    private String title;
    private String description;
    private String url;
    private String createdAt;
}
```

### MeiliSearchService
Next, we implemented the MeiliSearchService, which handles all core functionalities related to MeiliSearch.

```java
@Service
@RequiredArgsConstructor
public class MeiliSearchService {

    private final Client meiliClient;
    private final ObjectMapper objectMapper;

    public TaskInfo addOrUpdateDocument(SearchDocument document) {
        try {
            Index index = meiliClient.index("contents");
            String json = objectMapper.writeValueAsString(List.of(document));
            return index.addDocuments(json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to add/update document", e);
        }
    }

    public TaskInfo deleteDocument(String id) {
        try {
            Index index = meiliClient.index("contents");
            return index.deleteDocument(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete document", e);
        }
    }

    public SearchResultPaginated search(String query, String type, int page, int hitsPerPage) {
        Searchable result = meiliClient.index("contents")
            .search(new SearchRequest(query)
                .setPage(page)
                .setHitsPerPage(hitsPerPage)
                .setFilter(new String[]{"type=\"" + type + "\""})
            );

        if (result instanceof SearchResultPaginated paginated) {
            return paginated;
        }
        throw new IllegalStateException("Expected paginated search result, but got: " + result.getClass().getSimpleName());
    }

    public SearchResultPaginated search(String query, int page, int hitsPerPage) {
        Searchable result = meiliClient.index("contents")
            .search(new SearchRequest(query)
                .setPage(page)
                .setHitsPerPage(hitsPerPage)
            );

        if (result instanceof SearchResultPaginated paginated) {
            return paginated;
        }
        throw new IllegalStateException("Expected paginated search result, but got: " + result.getClass().getSimpleName());
    }

    public TaskInfo removeByType(String type) {
        String filter = String.format("type = '%s'", type);
        return meiliClient.index("contents").deleteDocumentsByFilter(filter);
    }

    public void waitForTask(TaskInfo taskInfo) throws InterruptedException {
        int taskUid = taskInfo.getTaskUid();
        while (true) {
            Task task = meiliClient.getTask(taskUid);
            String taskStatus = task.getStatus().taskStatus;

            System.out.println(taskStatus);
            if ("succeeded".equals(taskStatus)) {
                break;
            } else if ("failed".equals(taskStatus)) {
                throw new RuntimeException("Meilisearch task failed: " + task);
            }

            Thread.sleep(200); // 200ms polling
        }
    }
}
```

This service includes basic CRUD operations and a waitForTask function.
<b>One key part to highlight here is pagination.</b>

MeiliSearch supports two types of pagination:
1. offset and limit
2. page and hitsPerPage

In our case, we chose to use the <b>page and hitsPerPage style.</b>

<br>

By default, MeiliSearch returns a <b>Searchable</b> result, which serves as the parent type.
However, when using page and hitsPerPage pagination, it returns a <b>SearchResultPaginated</b>.

In our implementation, we used the instanceof check to distinguish between the two and return the correct type accordingly.

For more details, refer to the [official documentation](https://www.meilisearch.com/docs/reference/api/search).

<br>

The next important part to take a closer look at is the <b>waitForTask</b> function.
This function is mainly used during the <b>migration process</b>.

In my case, we already had a lot of data in the database, so I needed to migrate all of it at once.
I’ll explain this part in more detail later.

<br>

### Handler 
This is an example, as follows:

```java
public void addPost(GuildPost post, Long userIdx) {
    UserInfo userInfo = userService.findByUserIdx(userIdx);
    guildService.addPost(post);
    
    SearchDocument searchDocument = createSearchDocument(post, userInfo);
    try {
        TaskInfo result = meiliSearchService.addOrUpdateDocument(searchDocument);
        log.info("Post guild-{} added to search index successfully with task {}", post.getPostIdx(), result.getTaskUid());
    } catch (Exception e) {
        log.error("Failed to add post guild-{} to search index: {}", post.getPostIdx(), e.getMessage());
    }
}

public void updatePost(GuildPost post, Long userIdx) {
    UserInfo userInfo = userService.findByUserIdx(userIdx);
    guildService.updatePost(post, userIdx);

    SearchDocument searchDocument = createSearchDocument(post, userInfo);
    try {
        TaskInfo result = meiliSearchService.addOrUpdateDocument(searchDocument);
        log.info("Post guild-{} updated in search index successfully with task {}", post.getPostIdx(), result.getTaskUid());
    } catch (Exception e) {
        log.error("Failed to update post guild-{} in search index: {}", post.getPostIdx(), e.getMessage());
    }
}

public void removePost(long postIdx, long userIdx) {
    guildService.removePost(postIdx, userIdx);
    try {
        TaskInfo result = meiliSearchService.deleteDocument("guild-" + postIdx);
        log.info("Post guild-{} removed from search index successfully with task {}", postIdx, result.getTaskUid());
    } catch (Exception e) {
        log.error("Failed to remove post guild-{} from search index: {}", postIdx, e.getMessage());
    }
}

private SearchDocument createSearchDocument(GuildPost post, UserInfo userInfo) {
    GuildDocumentDto guildDocumentDto = GuildDocumentDto.fromDomain(post, userInfo);
    return SearchDocument
        .builder()
        .id("guild-" + post.getPostIdx())
        .type("guild")
        .title(post.getPostTitle() != null ? post.getPostTitle() : "")
        .description(guildDocumentDto.toDescription())
        .url("/guild/" + post.getPostIdx())
        .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
        .build();
}
```

Here, we included only the essential functions. you can safely remove the logging parts.
We added logging temporarily to verify that everything works correctly, but we plan to remove these logs during refactoring.

<br>

<b>To summarize, Title and Description are used as the searchable data, and we use filters to search within specific types.</b>

<img src="/search-meilisearch/search.png" alt="search" align="center" />

<br>

## Migration
If you didn’t use MeiliSearch from the beginning, you will likely need to perform a migration.
I implemented a dedicated service to handle the migration process.

### MigrationService

```java
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "migration.guild.enabled", havingValue = "true")
public class GuildMigrationService implements CommandLineRunner {

    private final GuildService guildService;
    private final GuildHandler guildHandler;
    private final UserService userService;

    private static final int BATCH_SIZE = 50;
    private final MeiliSearchService meiliSearchService;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting guild migration to MeiliSearch...");
        
        try {
            migrateGuildPosts();
            log.info("Guild migration completed successfully");
        } catch (Exception e) {
            log.error("Guild migration failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    private void migrateGuildPosts() throws InterruptedException {
        log.info("Remove all Guild data from MeiliSearch...");
        TaskInfo taskInfo = meiliSearchService.removeByType("guild");
        meiliSearchService.waitForTask(taskInfo);

        log.info("Fetching all guild posts from database...");
        
        int page = 1;
        int totalMigrated = 0;
        
        while (true) {
            List<GuildPost> posts = guildService.findAllPosts(BATCH_SIZE, page);
            
            if (posts.isEmpty()) {
                break;
            }
            
            log.info("Processing batch {} with {} guild posts", page, posts.size());
            
            for (GuildPost post : posts) {
                try {
                    UserInfo userInfo = userService.findByUserIdx(post.getUserIdx());
                    guildHandler.addGuildPostToSearchIndex(post, userInfo);
                    totalMigrated++;
                    
                    if (totalMigrated % 10 == 0) {
                        log.info("Migrated {} guild posts so far...", totalMigrated);
                    }
                } catch (Exception e) {
                    log.error("Failed to migrate guild post {} ({}): {}", 
                        post.getPostIdx(), post.getPostTitle(), e.getMessage());
                }
            }
            page++;
        }
        
        log.info("Migration completed. Total guild posts migrated: {}", totalMigrated);
    }
}
```

The removeType function deletes all data of the specified type, but since the <b>deletion is not immediate</b>, we use the previously mentioned waitForTask(taskInfo) to wait until the deletion is fully completed before proceeding with the creation process.

Next, you should pay attention to the `@ConditionalOnProperty(name = "migration.guild.enabled", havingValue = "true")` annotation.
You need to configure this property in the application.yml file as follows:

```yml
migration:
  guild:
    enabled: false
```
If you set enabled to true and start the server, the migration will run automatically.

<br>

# Test
After implementing the code, I created an integration test to verify that everything works correctly and no errors occur.

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@Sql(scripts = "/init.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
@Import(IntegratedMockConfig.class)
@Rollback(true)
class GuildControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MeiliSearchService meiliSearchService;

    @Autowired
    private UserService userService;

    @Autowired
    private GuildRepository guildRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private Client meiliClient;

    @Container
    static GenericContainer<?> meilisearchContainer = new GenericContainer<>(
        DockerImageName.parse("getmeili/meilisearch:v1.15"))
        .withExposedPorts(7700)
        .withEnv("MEILI_MASTER_KEY", "test-master-key")
        .withEnv("MEILI_ENV", "development")
        .withStartupTimeout(Duration.ofMinutes(2));

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (!meilisearchContainer.isRunning()) {
            meilisearchContainer.start();
        }

        String meilisearchUrl = "http://localhost:" + meilisearchContainer.getMappedPort(7700);
        registry.add("meilisearch.host", () -> meilisearchUrl);
        registry.add("meilisearch.apiKey", () -> "test-master-key");
    }

    @BeforeEach()
    void setUp() {
        meiliClient.createIndex("contents", "id");
        meiliClient.index("contents").updateFilterableAttributesSettings(new String[]{"type"});
        meiliClient.index("contents").updateSearchableAttributesSettings(new String[]{"title", "description"});
    }


    @Test
    void 길드_등록_테스트() throws Exception {
        User user = createUser();

        GuildPost guildPost = GuildPost.builder()
            ...
            .build();

        String json = objectMapper.writeValueAsString(guildPost);

        ResultActions result = mockMvc.perform(post("/api/guild")
            .contentType(MediaType.APPLICATION_JSON)
            .cookie(new Cookie("access_token", <token>))
            .content(json));

        result.andExpect(status().isCreated());
        result.andExpect(jsonPath("$.message").value("Success"));

        //DB
        ...
        List<GuildPost> postAll = guildRepository.findPostAll(condition);
        assertEquals(1, postAll.size());
        assertEquals("New Guild", postAll.getFirst().getPostTitle());

        // 동기화 이슈로 인한 대기 필요
        Thread.sleep(500);

        //MeiliSearch
        SearchResultPaginated search = meiliSearchService.search("New Guild", "guild", 1, 10);
        System.out.println(search);
        assertNotEquals(0, search.getHits().size());
        assertEquals(search.getHits().getFirst().get("title"), "New Guild");
    }
```

As Code above, I used TestContainers to run MeiliSearch in a temporary Docker container, which allowed me to verify that the tests ran successfully.

<br>

# Result
After implementing MeiliSearch, we experienced a significant improvement in our search functionality, with noticeably faster response times.
Given our limited memory environment on a VPS, MeiliSearch’s efficient memory usage made it an ideal choice for us.

It also supports Korean language processing, customizable ranking rules, and many other features, all of which met our needs without compromise.
Overall, we are very satisfied with the results.
