---
title:
  ko: "Grafana 를 이용해 에러 발생 시 슬랙으로 메세지 받기"
  en: "Receiving Slack Notifications for Errors using Grafana"
excerpt:
  ko: "Grafana 의 Alerting 기능을 이용해 Slack 으로 메세지 받기"
  en: "Receive Slack notifications using Grafana's Alerting feature"
date: "2025-06-18"
category:
  ko: "Infra"
  en: "Infra"
tags: ["Infra", "Log", "Clickhouse", "Grafana", "Slack", "Alert"]
slug: "setting-up-grafana-slack"
---

# 로그 알람이 중요한 이유
이전에 [포스팅](/blog/setting-up-log-server/)에서 로그 서버를 만들었고, 에러 로그까지 보는 것을 성공하였습니다.
하지만 직접 Grafana 에 들어가서 에러 로그를 지속적으로 보는 것은 불가능에 가깝습니다. 그래서 에러가 났을때 알람을 받도록 설정해야합니다.
그 기능이 Grafana 에 있어 이전에 세팅했던 Grafana 를 이용해 보겠습니다.

<br>

## 슬랙 세팅하기

https://api.slack.com/messaging/webhooks
먼저 슬랙은 위에 접속하셔서 문서에 나온대로 따라하면 그림과 같이 웹훅이 만들어집니다.


<img src="/setting-up-grafana-slack/slack-setting-up.png" alt="slack-setting-up" align="center" />

이제 여기서 얻은 <b>Webhook URL 을 사용해 그라파나 Alerting</b> 을 사용할 예정입니다.

<br>

## 그라파나 대쉬보드 세팅하기
먼저 그라파나에서 에러 관련 대쉬보드를 만들어 에러가 발생했을때 쉽게 체크할 수 있도록 하겠습니다.

<img src="/setting-up-grafana-slack/grafana-dashboard.png" alt="grafana-dashboard" align="center" />

위와 같이 쿼리로 에러만 나오게 하면 끝입니다. 여기 URL 을 나중에 복사 붙혀넣기가 필요합니다.

<br>


## Contact points 세팅하기

<b>Contact points 는 Alerting 에 존재하며, 에러가 발생했을때 어디로 보낼지에 대해 설정하는 공간입니다.</b>
Create 버튼을 눌러 새로운 Contact point 를 만들어줍니다.

<img src="/setting-up-grafana-slack/contact-points-1.png" alt="contact-points-1" align="center" />

그럼 위 그림처럼 나오는데 

- <b>Integration: Slack</b>
- <b>Webhook URL: <이전에 받은 URL></b>

과 같이 세팅해줍니다.
그리고 Test 버튼을 눌러 실행시키면 슬랙에 메세지가 정상적으로 오는 것을 확인할 수 있습니다.

<br>

저는 추가적으로 Optional Slack settings 옵션 안에 있는 <b>Title 과 Text Body</b> 를 다음과 같이 세팅했습니다.

<img src="/setting-up-grafana-slack/contact-points-2.png" alt="contact-points-2" align="center" />

```text
# title
🚨 [ALERT] Server error Alert 🚨

# Text Body
*Status:* Error
*Environment:* prod
|
🔍 *Description:*
More than 0 errors in last minute
|
🔗 [View in Grafana]: <Error Dashboard URL>
```

이후 테스팅을 진행하면 다음과 같이 정상적으로 오는 것을 알 수 있습니다.

<img src="/setting-up-grafana-slack/contact-points-result.png" alt="contact-points-result" align="center" />

<br>

## Alert Rule 세팅하기

이제 Alert Rule 세팅을 진행해보겠습니다. 먼저 사진을 보면서 설명하겠습니다.

<img src="/setting-up-grafana-slack/grafana-alert-rule-full.png" alt="grafana-alert-rule-full" align="center" />

### 1. Alert Rule Name
여기서는 간단하게 사용하고 싶은 이름을 입력해주시면 됩니다.

### 2. Define query and alert condition
여기서는 <b>어떤 쿼리로 찾을 것이고, 어떤 조건에 알림을 보낼 것인지 설정</b>하는 공간입니다.
<b>쿼리에서는 Float 가 필수적으로 들어가야 한다고 합니다.</b> 그래서 저는 Float64 를 사용하였습니다.

```sql
SELECT
  count(*)::Float64 AS error_count
FROM spring_logs
WHERE level = 'ERROR'
  AND timestamp > now() - interval 1 minute
```

<b>1분동안 일어난 에러</b>만 가져오도록 코드를 작성하였습니다.
또한 0개 이상 지속되었을때 발생하도록 하였습니다. 즉, <b>한개라도 발생했을 경우</b> 에러를 바로 던지도록 하였습니다.

### 3. Add folder and labels
여기서는 간단하게 무슨 폴더에 rule 을 저장할지, 어떤 라벨을 붙혀 관리할지에 대해 작성하는 공간입니다.

### 4. Set evaluation behavior
여기 부분이 매우 중요한데 저는 1분마다 에러를 체크하도록 설정하였습니다.
Pending period 라는 항목이 있는데 이건 <b>일정 이상 계속 트리거가 되어야 알림을 전송</b>하도록 하는 세팅입니다.

Keep firing for 부분은 <b>얼마만큼 firing 을 유지</b>할지에 대해 관리하는 공간입니다.
저는 여기서는 5분으로 했습니다. 즉, <b>5분 동안은 같은 에러가 슬랙으로 날라오지 않습니다.</b>

### 5. Configure notifications
여기서는 이전에 설정한 Slack 을 사용해주시면 됩니다.

Configure notification message 도 존재하긴 하지만 저는 이전에 설정한 메세지에 변수가 없기때문에 따로 설정하지 않았습니다.

<br>

이후 저장을 누르고 실제 error 테스트를 진행하면 이전 테스트했던 메세지와 똑같이 날라오게 됩니다.
또한 <b>Alert-rules 에 firing</b> 되었다고 태그가 바뀌어 쉽게 확인 할 수 있습니다.

<img src="/setting-up-grafana-slack/alerting-firing.png" alt="alerting-firing" align="center" />

이것으로 세팅을 모두 완료했습니다.

---language-separator---
# Why Log Alerts are Important
In a [previous post](/blog/setting-up-log-server/), we set up a log server and successfully monitored error logs.

However, it's practically impossible to continuously monitor error logs by directly accessing Grafana.
Therefore, we need to set up alerts to be notified when errors occur.
This functionality exists in Grafana, so let's use our previously configured Grafana setup.

<br>

## Setting up Slack

https://api.slack.com/messaging/webhooks
First, visit the link above and follow the documentation to create a webhook as shown in the image.

<img src="/setting-up-grafana-slack/slack-setting-up.png" alt="slack-setting-up" align="center" />

We'll use this <b>Webhook URL for Grafana Alerting</b> in the next steps.

<br>

## Setting up Grafana Dashboard
First, let's create an error-related dashboard in Grafana so we can easily check when errors occur.

<img src="/setting-up-grafana-slack/grafana-dashboard.png" alt="grafana-dashboard" align="center" />

Simply configure the query to show only errors as shown above. We'll need to copy this URL for later use.

<br>


## Setting up Contact Points

<b>Contact points are part of Alerting, and this is where you configure where alerts will be sent when an error occurs.</b>
Click the Create button to add a new Contact point.

<img src="/setting-up-grafana-slack/contact-points-1.png" alt="contact-points-1" align="center" />

When you see the screen above, configure the settings as follows:

- <b>Integration: Slack</b>
- <b>Webhook URL: Previously obtained Webhook URL</b>

After configuring these settings, click the Test button to verify that the message is properly delivered to Slack.

<br>

Additionally, I configured the <b>Title and Text Body</b> in the Optional Slack settings as follows:

<img src="/setting-up-grafana-slack/contact-points-2.png" alt="contact-points-2" align="center" />

```text
# title
🚨 [ALERT] Server error Alert 🚨

# Text Body
*Status:* Error
*Environment:* prod
|
🔍 *Description:*
More than 0 errors in last minute
|
🔗 [View in Grafana]: <Error Dashboard URL>
```

After testing, you should see that the message is delivered successfully, as shown below.

<img src="/setting-up-grafana-slack/contact-points-result.png" alt="contact-points-result" align="center" />

<br>

## Setting Up Alert Rule

Now let's set up the Alert Rule. I'll explain each step with screenshots.

<img src="/setting-up-grafana-slack/grafana-alert-rule-full.png" alt="grafana-alert-rule-full" align="center" />

### 1. Alert Rule Name
Here, simply enter the name you want to use for the alert rule.

### 2. Define query and alert condition
This section is where you specify <b>which query to use and under what conditions the alert should be triggered</b>.
<b>The query must return a Float value.</b> So, I used Float64.

```sql
SELECT
  count(*)::Float64 AS error_count
FROM spring_logs
WHERE level = 'ERROR'
  AND timestamp > now() - interval 1 minute
```

I wrote the code to fetch only the errors that occurred within the last 1 minute.
Also, the alert is triggered if the error count is greater than or equal to 0, meaning that even if a single error occurs, the alert will be sent immediately.

### 3. Add folder and labels
Here, you can simply choose which folder to save the rule in and which labels to use for managing it.

### 4. Set evaluation behavior
<b>This part is very important.</b> I set it to check for errors every 1 minute.
There is an option called "Pending period" which means <b>the alert will only be sent if the trigger condition is met continuously for a certain period.</b>

The "Keep firing for" option <b>controls how long the alert remains in the firing state.</b>
I set this to 5 minutes, so the same error will not be sent to Slack again within 5 minutes.

### 5. Configure notifications
Here, <b>just use the Slack contact point you set up earlier.</b>

There is also an option to "Configure notification message", but since my message does not use any variables, I did not set this separately.

<br>

After saving, if you test with an actual error, you will receive the same message as before.

Also, you can easily check that the tag has changed to <b>"firing"</b> in the Alert-rules section.

<img src="/setting-up-grafana-slack/alerting-firing.png" alt="alerting-firing" align="center" />

With this, the setup is complete.

