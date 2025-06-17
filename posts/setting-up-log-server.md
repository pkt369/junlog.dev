---
title:
  ko: "Ubuntu 환경에서 도커로 Log Server 세팅하기"
  en: "Setting Up Log Server using Docker on Ubuntu"
excerpt:
  ko: "Docker compose 를 이용해 Vector + Clickhouse + Grafana 조합으로 Log Sever 구축하기"
  en: "Setting Up a Log Server with Vector, Clickhouse, and Grafana using Docker Compose"
date: "2025-06-17"
category:
  ko: "Infra"
  en: "Infra"
tags: ["Infra", "Log", "Vector", "Clickhouse", "Grafana", "Docker", "Docker-Compose", "Ubuntu"]
slug: "setting-up-log-server"
---

# 로그 서버를 세팅해야 하는 이유
먼저 로그 서버를 만들기전에 왜 로그서버를 만들어야 하는지에 대해서 적어볼려고 합니다.
직장에서 가장 많이 배운 것이 있다면 로그가 매우 중요하다는 것 입니다.

원래 코드를 작성할때 테스트 코드, EndToEnd Test 등 오류를 예방하기 위해 많은 작업들을 수행합니다.
하지만 그럼에도 불구하고 예상치 못한 에러가 발생할 수 있습니다.
이때 중요한 것을 빠른 에러 체크와 핫픽스입니다. 이때 이 작업을 가능하게 하는 것이 <b>로그</b>입니다.

<br>

실서버에서는 콘솔처럼 우리가 에러를 쉽게 확인할 수 없기 때문에 꼼꼼하게 로깅처리를 처리해야하며, 이 로그들을 쉽게 확인할 수 있어야 합니다.
이전 회사에서는 <b>Logstash + Kafka + Elasticsearch</b> 또는 <b>Clickhouse + Grafana</b> 조합으로 사용하였습니다.

<br>

제가 사용할 기술 스택은 <b>Vector + Clickhouse + Grafana</b> 조합입니다.
그리고 조합을 쉽게 사용하기 위해 <b>Docker</b> 를 이용할 예정입니다.

<br>

# 세팅하기
Docker install -> Docker compose -> other config file -> Clickhouse -> Grafana 순으로 세팅을 진행하겠습니다.

## Docker install
우분투에는 따로 도커가 설치되어 있지 않아서 설치를 먼저 진행해야 합니다.
https://docs.docker.com/engine/install/ubuntu/
세팅은 공식 문서를 참고하여 진행하였습니다.

```bash
# 명령어
docker compose version
# 결과
Docker Compose version v2.36.2
```
위 명령어를 통해 정상적으로 잘 된 것을 볼 수 있습니다.

<br>

## Docker compose 작업하기
저는 해당 작업을 로컬에서 VPS 서버로 옮기기 위해서 Git Repository 기능을 이용하였습니다.
> 참고: https://github.com/pkt369/log-server

<img src="/setting-up-log-server/log-server-structure.png" alt="log-server-structure" align="center" />

먼저 구조는 위와 같습니다.

<br>


### docker-compose.yml

```yml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse
    ports:
      - "8123:8123"     # HTTP interface
      - "9000:9000"     # Native TCP interface
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    environment:
      - CLICKHOUSE_USER=default
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:8123 || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 3s

  vector:
    image: timberio/vector:latest-debian
    container_name: vector
    volumes:
      - ./vector.yaml:/etc/vector/vector.yaml:ro
      - /var/log/server:/var/log/server:ro
    environment:
      - CLICKHOUSE_USER=default
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
    depends_on:
      clickhouse:
        condition: service_healthy

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - clickhouse

volumes:
  clickhouse-data:
  grafana-data:

```

먼저 저는 <b>/var/log/*.log</b> 로 로깅을 세팅하였고, <b>${CLICKHOUSE_PASSWORD}</b> 으로 env 파일에서 가져와 사용하고 있습니다.

또한 vector 에서 시작할 때 healthcheck 를 진행하는데 클릭하우스가 셋업이 완료되기 전에 체크하는 이슈가 있었습니다.
문제를 해결하기 위해 docker compose 파일 내에 health check 를 하게 만들었고, 성공적으로 health check 를 성공할 시 vector 에서 health check 를 하게 만들었습니다.

<br>

### vector.yaml

```yml
sources:
  file_logs:
    type: file
    include:
      - /var/log/server/*.log
    ignore_older_secs: 86400

transforms:
  parse_json:
    type: remap
    inputs:
      - file_logs
    source: |
      .parsed = parse_json!(.message)
      .timestamp = format_timestamp!(parse_timestamp!(.parsed.timestamp, "%+"), "%F %T")
      .level = .parsed.level
      .profile = .parsed.profile
      .thread = .parsed.thread
      .logger = .parsed.logger
      .message = .parsed.message
      .stack_trace = .parsed.stack_trace

sinks:
  clickhouse_sink:
    type: clickhouse
    inputs:
      - parse_json
    endpoint: http://clickhouse:8123
    database: default
    table: spring_logs
    auth:
      strategy: "basic"
      user: "default"
      password: ${CLICKHOUSE_PASSWORD}
```

위에서 눈여겨 봐야할 곳은 transforms 입니다.
받은 데이터를 파싱해서 clickhouse 에 넣을 수 있게 도와줍니다.

<br>

작업 내용을 git 에 push 후 vps 내에서 git clone 명령어를 통해 다운받아서 실행하였습니다.

```bash
docker compose up -d
```


<br>

## 클릭하우스에 Table 만들기

도커를 실행하셨다면 아래와 같은 명령어로 접근이 가능합니다.

```bash
docker exec -it clickhouse clickhouse-client
```

이후 아래의 명령어로 테이블을 생성합니다.

```sql
use default;

CREATE TABLE spring_logs (
    timestamp DateTime,
    level String,
    profile String,
    thread String,
    logger String,
    message String,
    stack_trace String
) ENGINE = MergeTree()
ORDER BY timestamp;
```

이렇게 테이블을 만들어야 vector 에서 보내는 데이터를 해당 테이블에 저장할 수 있습니다.


<br>

<br>

## 서버 log 작업하기 with Spring boot
제가 그룹에 합류햇을때 프로젝트는 스프링부트였고, <b>Logback</b> 으로 로깅을 진행하였습니다.
그리고 json 으로 로깅하기 위해서 gradle 에 추가하여 사용하였습니다.

```gradle
implementation 'net.logstash.logback:logstash-logback-encoder:7.4'
```

https://mvnrepository.com/artifact/net.logstash.logback/logstash-logback-encoder
에서 참고하여 사람들이 많이 사용하는 버전 중 최신으로 선택하였습니다.

<b>logback-spring.xml</b> 을 작성해야하는데 파일구조는 resource 폴더 바로 밑에 작성하였습니다.

```xml
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>

    <springProperty scope="context" name="profile" source="spring.profiles.active" defaultValue="default"/>
    <springProperty scope="context" name="LOG_PATH" source="logging.file.path" defaultValue="./logs"/>

    <appender name="JSON_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_PATH}/json-logback.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_PATH}/json-logback-%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxHistory>3</maxHistory>
            <totalSizeCap>${LOG_FILE_TOTAL_SIZE_CAP:-3GB}</totalSizeCap>
            <cleanHistoryOnStart>${LOG_FILE_CLEAN_HISTORY_ON_START:-false}</cleanHistoryOnStart>
            <maxFileSize>${LOG_FILE_MAX_SIZE:-10MB}</maxFileSize>
        </rollingPolicy>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <fieldNames>
                <timestamp>timestamp</timestamp>
                <level>level</level>
                <thread>thread</thread>
                <logger>logger</logger>
                <message>message</message>
                <fieldName name="profile" value="${profile}" />
            </fieldNames>
        </encoder>
    </appender>

    <springProfile name="local">
        <root level="DEBUG">
            <appender-ref ref="CONSOLE" />
        </root>
        <include resource="org/springframework/boot/logging/logback/base.xml"/>
    </springProfile>

    <springProfile name="prod">
        <root level="INFO">
            <appender-ref ref="JSON_FILE" />
        </root>
    </springProfile>
</configuration>
```

먼저 보셔야 할 곳은 <b>LOG_PATH</b> 이름으로 사용 중인 springProperty 를 보셔야 합니다.
로컬에는 /var/log 가 없어 에러를 던지기 때문에 <b>application-local</b> 과 <b>application-prod</b> 에 따로 작성하셔야 합니다.

```yml
# local
logging:
  file:
    path: ./logs

# prod
logging:
  file:
    path: /var/log/server
```

조금 설명을 보태자면 스프링에는 profile 시스템이 존재하는데 application-(profile) 형태로 사용할 수 있습니다.

SizeAndTimeBasedRollingPolicy 는 <b>하나의 로그 파일이 너무 커지거나 오래되면, 기존 로그 파일을 일정 조건에 따라 자동으로 분리하는 것을 의미합니다.</b>
또한 위에서 vector 에서 설정한 부분과 logging 이 일치하도록 하도록 하였습니다.

<br>

## Grafana 서버 세팅하기 (옵션)
저는 grafana.domain.com 형태로 사용해볼려고 합니다.
저는 Cloudflare 에서 도메인을 구매했고 다음과 같이 추가하였습니다.

```DNS
Type: A
Name: grafana
Content: <당신의 VPS 서버 IP 주소>
Proxy status: DNS only
TTL: Auto
```

위와 같이 DNS only 로 설정하면 Cloudflare 에서 자동으로 서버로 리다이렉션 시켜줍니다.

<br>


### nginx
저의 경우 nignx 로 서빙하는 구조라 다음과 같이 세팅을 완료하였습니다.

```bash
nano /etc/nginx/conf.d/default.conf

# 파일 내부에 복사 붙혀넣기
server {
    listen 443 ssl;
    server_name grafana.sena.gg;

    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3030/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

위와 같이 넣어줍니다.
보시면 443 즉, https 를 제공하는데 여기서 ssl 인증서를 만들어줘야 합니다. 
```bash
sudo certbot --nginx -d grafana.domain.com
```

위에 도메인을 본인의 도메인으로 변경하여 <b>ssl 인증서</b>를 만들어줍니다.
그럼 <b>nginx 에 자동으로 ssl 관련 세팅</b>이 들어가게 됩니다.


그리고 저는 추가 보안을 위해 로그인을 하도록 설정하였습니다.
이전에 만들어둔 보안파일이 있어서 바로 적용하였습니다.
참고) https://junlog.dev/blog/setting-up-netdata/
여기서 우분투에서 로그인 계정 만드는 부분을 참고하시면 됩니다.

<br>

이제 grafana 에 접속하면 로그인 창이 나오는데 <b>처음 아이디와 비밀번호는 둘 다 admin</b> 입니다.
로그인하면 다음과 같이 페이지를 볼 수 있습니다.

<img src="/setting-up-log-server/grafana-home.png" alt="grafana-home" align="center" />

<br>
<br>

## Grafana 에서 Clickhouse plugin 세팅하기

그라파나의 Data Source 에 Clickhouse 가 바로 존재하지 않아 다음과 같이 설치해야 합니다.
Administration -> plungins and data -> plugin 을 선택합니다.

<img src="/setting-up-log-server/clickhouse-install-1.png" alt="clickhouse-install-1" align="center" />

이후 clickhouse 를 검색으로 찾은 다음 install 버튼을 눌러 설치해줍니다.

<img src="/setting-up-log-server/clickhouse-install-2.png" alt="clickhouse-install-2" align="center" />
<img src="/setting-up-log-server/clickhouse-install-3.png" alt="clickhouse-install-3" align="center" />

위와 같이 세팅이 완료가 되었다면 add datasoruces 를 눌러 clickhouse 세팅을 진행합니다.

<img src="/setting-up-log-server/clickhouse-setting-up-1.png" alt="clickhouse-setting-up-1" align="center" />

password 에는 env 파일에 세팅한 것과 같은 비밀번호를 적어줍니다.

<img src="/setting-up-log-server/clickhouse-setting-up-2.png" alt="clickhouse-setting-up-2" align="center" />

위와 같이 초록색 체크표시가 뜨면 정상적으로 세팅이 완료되었습니다.

<br>
<br>


# 테스트하기

이걸로 세팅이 끝이 났고 dashboard 를 만들어 다음과 같이 정상적으로 동작하는 지 알아볼 시간입니다.

## Spring boot 에서 확인하기
테스트를 위해 info 와 error 를 서버에 만들어서 진행하였습니다.

```java
public void info() {
  log.info("test");
}
public void error() {
    try {
        throw new RuntimeException("error test");
    } catch (Exception e) {
        log.error("error", e);
    }
}
```

그러면 스프링 log 에서 다음과 같이 로깅이 된 것을 볼 수 있습니다.

```json
...
{"timestamp":"2025-06-16T11:39:44.709+0900","logger_name":"com.test.service.MainService","level":"INFO","thread":"http-nio-8080-exec-1","logger":"com.test.service.MainService","message":"test"}
{"timestamp":"2025-06-16T11:54:20.345+0900","logger_name":"com.test.service.MainService","level":"ERROR","thread":"http-nio-8080-exec-2","logger":"com.test.service.MainService","message":"errorjava.lang.RuntimeException: error test\n\tat com.test.service.MainService.error(MainService.java:16)\n\tat com.test.controller.MainController.error(MainController.java:62)~"}
```


## Grafana 에서 확인하기
위에서 로깅이 잘되었다면 Vector 가 Clickhosue 로 잘 보냈을 것 입니다.
그라파나 대쉬보드 또는 explore 에서 확인하실 수 있습니다.


<img src="/setting-up-log-server/grafana-check.png" alt="grafana-check" align="center" />

이것으로 세팅이 완료되었습니다.
다음 포스팅으로는 Grafana 를 이용해 슬랙으로 알람을 주는 세팅을 이어서 해볼 예정입니다.



---language-separator---

# Why You Need a Log Server
Before setting up a log server, I want to explain why we need one. One of the most important things I've learned in my career is how critical logging is.

When writing code, we perform many tasks to prevent errors, such as writing test code and end-to-end tests.
However, unexpected errors can still occur despite these precautions. What's important in these situations is quick error detection and hotfixes.
This is where **logs** become crucial.

<br>

In production servers, we can't easily check errors like we can in a console, so we need to handle logging thoroughly and be able to check these logs easily.
At my previous company, we used either **Logstash + Kafka + Elasticsearch** or **Clickhouse + Grafana** combinations.

<br>

The tech stack I'll be using is the **Vector + Clickhouse + Grafana** combination. And to make this combination easy to use, I'll be using **Docker**.

<br>

# Setting Up
We'll proceed with the setup in this order: Docker install -> Docker compose -> other config files -> Clickhouse -> Grafana.

<br>

## Docker Install
Ubuntu doesn't come with Docker preinstalled, so we need to install it first.
https://docs.docker.com/engine/install/ubuntu/
I followed the official documentation for the setup.

```bash
# Command
docker compose version
# Result
Docker Compose version v2.36.2
```
You can see that it works correctly through the above command.

<br>

## Working with Docker Compose
I used Git Repository functionality to move this work from local to VPS server.
> Reference: https://github.com/pkt369/log-server

<img src="/setting-up-log-server/log-server-structure.png" alt="log-server-structure" align="center" />

The structure is as shown above.

<br>


### docker-compose.yml

```yml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse
    ports:
      - "8123:8123"     # HTTP interface
      - "9000:9000"     # Native TCP interface
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    environment:
      - CLICKHOUSE_USER=default
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:8123 || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 3s

  vector:
    image: timberio/vector:latest-debian
    container_name: vector
    volumes:
      - ./vector.yaml:/etc/vector/vector.yaml:ro
      - /var/log/server:/var/log/server:ro
    environment:
      - CLICKHOUSE_USER=default
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
    depends_on:
      clickhouse:
        condition: service_healthy

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - clickhouse

volumes:
  clickhouse-data:
  grafana-data:

```
First, I set up logging to <b>/var/log/*.log</b> and use <b>${CLICKHOUSE_PASSWORD}</b> which is loaded from the env file.

Also, there was an issue where Vector would perform a healthcheck before Clickhouse finished setting up.
To solve this problem, I added a healthcheck in the docker compose file, so Vector only performs its healthcheck after Clickhouse successfully completes its own healthcheck.

<br>

### vector.yaml

```yml
sources:
  file_logs:
    type: file
    include:
      - /var/log/server/*.log
    ignore_older_secs: 86400

transforms:
  parse_json:
    type: remap
    inputs:
      - file_logs
    source: |
      .parsed = parse_json!(.message)
      .timestamp = format_timestamp!(parse_timestamp!(.parsed.timestamp, "%+"), "%F %T")
      .level = .parsed.level
      .profile = .parsed.profile
      .thread = .parsed.thread
      .logger = .parsed.logger
      .message = .parsed.message
      .stack_trace = .parsed.stack_trace

sinks:
  clickhouse_sink:
    type: clickhouse
    inputs:
      - parse_json
    endpoint: http://clickhouse:8123
    database: default
    table: spring_logs
    auth:
      strategy: "basic"
      user: "default"
      password: ${CLICKHOUSE_PASSWORD}
```
The key part to note above is the transforms section.
It helps parse the received data and prepare it for insertion into Clickhouse.

I pushed my work to a Git repository and cloned it using the git clone command.

```bash
docker compose up -d
```


<br>

## Create Table in Clickhouse

If Docker is running, you can access it using the command below.

```bash
docker exec -it clickhouse clickhouse-client
```

And create table using followed command.

```sql
use default;

CREATE TABLE spring_logs (
    timestamp DateTime,
    level String,
    profile String,
    thread String,
    logger String,
    message String,
    stack_trace String
) ENGINE = MergeTree()
ORDER BY timestamp;
```

After creating this table, Vector can sends it into this table.

<br>

<br>

## Server logging with Spring boot
When I joined the team, the project was using Spring Boot and <b>Logback</b> for logging.
And to log in JSON format, we added the following dependency to gradle:

```gradle
implementation 'net.logstash.logback:logstash-logback-encoder:7.4'
```

https://mvnrepository.com/artifact/net.logstash.logback/logstash-logback-encoder
I chose the latest version among the most commonly used versions by referring to this link.

I created <b>logback-spring.xml</b> directly under the resource folder.

```xml
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>

    <springProperty scope="context" name="profile" source="spring.profiles.active" defaultValue="default"/>
    <springProperty scope="context" name="LOG_PATH" source="logging.file.path" defaultValue="./logs"/>

    <appender name="JSON_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_PATH}/json-logback.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_PATH}/json-logback-%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxHistory>3</maxHistory>
            <totalSizeCap>${LOG_FILE_TOTAL_SIZE_CAP:-3GB}</totalSizeCap>
            <cleanHistoryOnStart>${LOG_FILE_CLEAN_HISTORY_ON_START:-false}</cleanHistoryOnStart>
            <maxFileSize>${LOG_FILE_MAX_SIZE:-10MB}</maxFileSize>
        </rollingPolicy>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <fieldNames>
                <timestamp>timestamp</timestamp>
                <level>level</level>
                <thread>thread</thread>
                <logger>logger</logger>
                <message>message</message>
                <fieldName name="profile" value="${profile}" />
            </fieldNames>
        </encoder>
    </appender>

    <springProfile name="local">
        <root level="DEBUG">
            <appender-ref ref="CONSOLE" />
        </root>
        <include resource="org/springframework/boot/logging/logback/base.xml"/>
    </springProfile>

    <springProfile name="prod">
        <root level="INFO">
            <appender-ref ref="JSON_FILE" />
        </root>
    </springProfile>
</configuration>
```

First, you need to look at the springProperty named <b>LOG_PATH</b>.
Since /var/log doesn't exist in the local environment and would throw an error, you need to configure it separately in <b>application-local</b> and <b>application-prod</b>.

```yml
# local
logging:
  file:
    path: ./logs

# prod
logging:
  file:
    path: /var/log/server
```
To add some explanation, Spring has a profile system where you can use the application-(profile) format.

SizeAndTimeBasedRollingPolicy means that <b>when a log file becomes too large or too old, it automatically splits the existing log file according to certain conditions.</b>
Also, I made sure that the logging matches the settings we configured in vector above.

<br>

## Setting up Grafana Server (Optional) 
I want to use it in the form of grafana.domain.com.
I purchased a domain from Cloudflare and added it as follows:

```DNS
Type: A
Name: grafana
Content: <IP Address>
Proxy status: DNS only
TTL: Auto
```

If you set it to DNS only, Cloudflare will automatically redirect the request to your server.

<br>


### Nginx

In my case, I used Nginx to serve requests, so I set it up as shown below.

```bash
nano /etc/nginx/conf.d/default.conf

# conf file
server {
    listen 443 ssl;
    server_name grafana.sena.gg;

    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3030/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```
As you can see, port 443 is used for HTTPS, so you’ll need to set up an SSL certificate.


```bash
sudo certbot --nginx -d grafana.domain.com
```
Change the domain above to your own domain to create an <b>SSL certificate</b>.
This will automatically add <b>SSL-related settings to nginx</b>.

For additional security, I set up login authentication.
I already had a security file created previously, so I applied it directly.
Reference) https://junlog.dev/blog/setting-up-netdata/
You can refer to the section about creating login accounts in Ubuntu.

<br>

When you access Grafana, a login screen will appear. <b>The initial username and password are both "admin"</b>.
After logging in, you'll be able to see the page as shown below.

<img src="/setting-up-log-server/grafana-home.png" alt="grafana-home" align="center" />

<br>
<br>

## Setting up Clickhouse Plugin in Grafana

Since Clickhouse is not available by default in Grafana's Data Sources, we need to install it as follows.
Go to Administration -> Plugins and Data -> Plugin.

<img src="/setting-up-log-server/clickhouse-install-1.png" alt="clickhouse-install-1" align="center" />

Then search for Clickhouse and click the install button.

<img src="/setting-up-log-server/clickhouse-install-2.png" alt="clickhouse-install-2" align="center" />
<img src="/setting-up-log-server/clickhouse-install-3.png" alt="clickhouse-install-3" align="center" />

Once the installation is complete, click add datasources to proceed with Clickhouse setup.

<img src="/setting-up-log-server/clickhouse-setting-up-1.png" alt="clickhouse-setting-up-1" align="center" />

For the password, enter the same password you set in your env file.

<img src="/setting-up-log-server/clickhouse-setting-up-2.png" alt="clickhouse-setting-up-2" align="center" />

When you see a green checkmark like above, the setup has been completed successfully.

<br>
<br>


# Testing

Now that the setup is complete, it's time to create a dashboard and verify that everything is working properly.

## Testing in Spring Boot
For testing purposes, I created info and error endpoints on the server.

```java
public void info() {
  log.info("test");
}
public void error() {
    try {
        throw new RuntimeException("error test");
    } catch (Exception e) {
        log.error("error", e);
    }
}
```

Then now You can see the log below.

```json
...
{"timestamp":"2025-06-16T11:39:44.709+0900","logger_name":"com.test.service.MainService","level":"INFO","thread":"http-nio-8080-exec-1","logger":"com.test.service.MainService","message":"test"}
{"timestamp":"2025-06-16T11:54:20.345+0900","logger_name":"com.test.service.MainService","level":"ERROR","thread":"http-nio-8080-exec-2","logger":"com.test.service.MainService","message":"errorjava.lang.RuntimeException: error test\n\tat com.test.service.MainService.error(MainService.java:16)\n\tat com.test.controller.MainController.error(MainController.java:62)~"}
```

## Checking in Grafana
If the logging was successful above, Vector should have sent the data to Clickhouse properly.
You can check this in the Grafana dashboard or explore section.


<img src="/setting-up-log-server/grafana-check.png" alt="grafana-check" align="center" />

This completes the setup.
In the next post, we'll continue by setting up Slack alerts using Grafana.

