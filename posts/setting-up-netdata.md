---
title:
  ko: "Ubunutu 에 Netdata 세팅하고 슬랙에 메세지 보내기"
  en: "Setting Up Netdata on Ubuntu with Slack"
excerpt:
  ko: "Netdata 에서 메모리와 CPU 모니터링을 하고 임계점에 올 경우 Slack 으로 메세지 보내기"
  en: "Monitor memory and CPU with Netdata and send alerts to Slack when usage exceeds limits."
date: "2025-06-13"
category:
  ko: "Infra"
  en: "Infra"
tags: ["Infra", "Netdata", "Slack", "Memory", "CPU", "Ubuntu"]
slug: "setting-up-netdata"
---

# 사용하게 된 계기
팀 프로젝트에 합류하면서 인프라 관련 세팅을 맡게 되었습니다.
최대한 돈을 아껴야 하는 상황이라 메모리와 cpu 를 적게 잡게 되었고, 메모리가 70% 이상 꾸준히 넘을 경우 Memory 나 CPU 를 늘리기로 하였습니다.
<br>

이러한 상황이라 Memory 와 CPU 를 모니터링을 계속 해야하는 상황이 되었고, 우분투 환경에서 Netdata 를 사용하게 되었습니다.
<br>

# Netdata
Netdata는 실시간으로 시스템과 애플리케이션의 성능을 모니터링하고 알람을 제공하는 가벼운 오픈소스 모니터링 도구입니다.
> 만약 무거웠다면 다른 오픈소스를 사용했을 것 같습니다.

<br>

## 설치
설치를 위해서는 여러가지 방법이 있지만 우분투에 직접 설치하였습니다. 
```bash
# Netdata Cloud(클라우드) 계정과 연동하도록 설계된 설치 스크립트
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh && sh /tmp/netdata-kickstart.sh --no-updates --stable-channel --disable-telemetry
```
https://learn.netdata.cloud/docs/netdata-agent/installation/linux/
해당 문서를 참고하시면 됩니다!


<br>

<img src="/setting-up-netdata/after-install.png" alt="after-install" align="center" />

<br>
설치를 완료하고 포트 19999 로 가면 위 그림과 같이 설치되어 있는 것을 볼 수 있습니다.<br>
또한 오른쪽 밑 버튼을 통해 그래프를 확인할 수 있습니다.

<br>
<br>


## 아이디와 비밀번호 세팅하기 (옵션)
저는 Nginx 를 사용하고 특정 URL 로 접근시 Netdata 로 접근할 수 있도록 세팅해두었습니다.
이로 인해 초기 Netdata 에 접속하면 아이디와 비밀번호 없이 아무나 들어갈 수 있는 상황이라 아이디와 비밀번호를 걸어두어야 했습니다.


먼저 다음 명령어 

``` bash
sudo apt install apache2-utils
```

를 통해 htpasswd 를 설치하고 진행합니다.
그리고 다음을 통해 아이디 비밀번호를 만들어냅니다.  

``` bash
sudo htpasswd -c /etc/nginx/.htpasswd username
```

이후 비밀번호를 입력하고 엔터하면 만들어집니다.
> -c 옵션은 새로 만드는 옵션이라 사용자 추가할때는 제거하고 사용해주시면 됩니다.

<br>

이후 Nginx 를 사용하는 경우 아래의 명령어를 
```conf
location /netdata/ {
  ...other settings

  auth_basic "Restricted Access";
  auth_basic_user_file /etc/nginx/.htpasswd;
}
```

nginx.conf (default.conf) 파일에 추가해줍니다.

```bash
# 설정 오류 체크
sudo nginx -t

# reload 서버
sudo systemctl reload nginx
```
그리고 위 명령어를 통해 체크하고 재실행합니다.
다시 netdata 에 접속하면 아이디와 비밀번호가 생겨져 있는 것을 알 수 있습니다.

<br>

## Slack Setting 하기
먼저 Slack 에 알람을 받을 채널을 하나 만들어야 합니다.

만든 다음 https://api.slack.com/messaging/webhooks 여기 링크를 보고 WebHooks 을 만들어줍니다.
위를 따라하게 되면 다음 그림과 같이 Webhooks 를 얻을 수 있습니다.

<br>

<img src="/setting-up-netdata/slack-webhook.png" alt="slack-webhook" align="center" />

<br>
이제 <b>health_alarm_notify.conf</b> 파일을 수정해야 하는데 저는 복사해서 사용할 예정입니다.

> 저는 ssl 로 직접 console 에 접근하였습니다.

<br>

기존 파일에 사용하지 않고 복사해서 사용하는 이유는 다음과 같습니다.
1. <b>커스텀 설정</b>: /etc/netdata/
2. <b>kickstart 설치시</b>: /opt/netdata/etc/netdata/
3. <b>Default</b>: /usr/lib/netdata/conf.d/


위와 같은 순서대로 찾아서 동작하게 되는데 /etc/netdata 에서 찾는다면 <b>다음으로 가지않고</b> 바로 실행합니다.
그리고 /usr/lib/netdata/conf.d 에 있는 health_alarm_notify.conf 을 사용하게 된다면 업데이트 되었을때 덮어씌워지게 되면서 다시 <b>재설정</b>을 해야합니다.

따라서 저희는 1번인 커스텀 설정에 복사해서 사용하는 방법을 사용할 예정입니다.

```bash
sudo cp /usr/lib/netdata/conf.d/health_alarm_notify.conf /etc/netdata/
sudo nano /etc/netdata/health_alarm_notify.conf
```

이렇게 하면 파일이 새롭게 생기고, nano 명령어를 통해 내부를 수정할 수 있습니다.
<b>Ctrl + W</b> 명령어로 <b>SLACK_WEBHOOK_URL</b> 을 검색해줍니다.

<b>SLACK_WEBHOOK_URL 에 이제 이전에 슬랙에서 받았던 webhook 을 넣어줍니다.</b>
<b>DEFAULT_RECIPIENT_SLACK 에는 webhook 에 설정했던 채널을 넣어줍니다.</b>

다하면 다음과 같습니다.

<br>

<img src="/setting-up-netdata/health-alarm-notify.png" alt="health-alarm-notify" align="center" />

<br>

다음과 같이 작성하고나서 <b>Ctrl + O 로 저장하고, Ctrl + X 로 나와줍니다.</b>
이후 `sudo systemctl restart netdata` 서버를 재실행을 시켜줍니다.

이후 다음 명령어로 테스트를 진행하면 슬랙으로 메세지가 오게 됩니다.
```bash
sudo /usr/libexec/netdata/plugins.d/alarm-notify.sh test slack
```

<br>

<img src="/setting-up-netdata/test-slack.png" alt="test-slack" align="center" />

<br>
<br>

## Memroy 임계점 설정하기
지금까지 세팅을 한 이유는 임계점이 넘었을때 슬랙으로 알람을 받는게 목표였습니다.
https://learn.netdata.cloud/docs/alerts-&-notifications/alert-configuration-reference

일단 모든 명령어는 <b>공식 문서</b>에서 가져와 실행하였고 잘 동작하는 것을 확인하였습니다.

<br>

공식문서에 따르면 health.d/ram-usage.conf 파일을 만들어야된다고 나와있습니다.

저의 경우 <b>/etc/netdata/health.d/ram-usage.conf</b> 에 파일을 만들었으며 명령어는 다음과 같습니다.

```bash
sudo nano /etc/netdata/health.d/ram-usage.conf

### 다음 세팅들을 넣어주세요.
alarm: ram_usage
    on: system.ram
lookup: average -1m percentage of used
 units: %
 every: 1m
  warn: $this > 60
  crit: $this > 90
  info: The percentage of RAM being used by the system.
###
```

저장 후 다음 명령어로 리부팅 시켜줍니다.
```bash
sudo netdatacli reload-health
```

이후 다음 그림과 같이 메세지가 날라온것을 알 수 있습니다.
<img src="/setting-up-netdata/ram-usage.png" alt="ram-usage" align="center" />

<br>

이것으로 모든 세팅을 완료했습니다.
해당 세팅을 마침으로써 서버 자원을 좀더 효율적으로 활용 할 수 있게 되었습니다.



---language-separator---

# Why We Chose Netdata
When I joined this project, I was assigned to handle infrastructure settings. 
Since our budget was limited, we had to minimize memory and CPU usage.
We decided that if memory or CPU usage stays above 70% consistently, we will increase the resources.
<br>

Given the situation, we needed to monitor memory and CPU usage continuously, so we decided to use Netdata on our Ubuntu based system.

<br>

# Netdata
Netdata is a <b>lightweight, open-source monitoring tool that provides real-time system and application performance metrics, along with alerting.</b>
> If it had been heavy, I would have chosen a different open-source solution.

<br>

## Install
While there are multiple ways to install Netdata, I decided to install it directly on Ubuntu.

```bash
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh && sh /tmp/netdata-kickstart.sh --no-updates --stable-channel --disable-telemetry
```
https://learn.netdata.cloud/docs/netdata-agent/installation/linux/
You can refer to the documentation above.


<br>

<img src="/setting-up-netdata/after-install.png" alt="after-install" align="center" />

<br>
After installing Netdata, you can access it by navigating to port 19999.
You’ll see a dashboard such as the one above.

To view detailed graphs, click the button at the bottom right.

<br>
<br>


## Setting Up ID and Password (Optional)
I configured Nginx to route requests to Netdata through a specific URL.
Because of this, anyone could access the Netdata dashboard without authentication,
so I needed to secure it with a username and password.

First, run the following command:

``` bash
sudo apt install apache2-utils
```


Then You got htpasswd. 
Next, use the following command to create a username and password.

``` bash
sudo htpasswd -c /etc/nginx/.htpasswd username
```


After entering the password and pressing enter, it will be created.
> The -c option is for creating a new file. When adding additional users, remove this option.

<br>

If you're using Nginx, add the following configuration.

```conf
location /netdata/ {
  ...other settings

  auth_basic "Restricted Access";
  auth_basic_user_file /etc/nginx/.htpasswd;
}
```

Add the above configuration to nginx.conf (default.conf) File.

```bash
# 설정 오류 체크
sudo nginx -t

# reload 서버
sudo systemctl reload nginx
```
After that, you can check for errors using the command. If everything looks fine, restart the service using the appropriate command.

Now, when you access Netdata, you’ll see that the ID and password authentication is enabled.

<br>

## Setting Up Slack Integration
First, you need to create a channel in Slack where you want to receive alerts.

After creating the channel, visit https://api.slack.com/messaging/webhooks and follow the instructions to create a WebHook.
Following these steps will give you a Webhook URL as shown in the image below.

<br>

<img src="/setting-up-netdata/slack-webhook.png" alt="slack-webhook" align="center" />

<br>
Now we need to modify the <b>health_alarm_notify.conf</b> file. I'll be using a copy of the original file.

> I accessed the console directly via SSL.

<br>

Here's why I'm using a copy instead of modifying the original file:
1. <b>Custom settings</b>: /etc/netdata/
2. <b>Kickstart installation</b>: /opt/netdata/etc/netdata/
3. <b>Default</b>: /usr/lib/netdata/conf.d/


Netdata searches for configuration files in this order. If it finds the file in /etc/netdata, it will <b>use that file and stop searching</b>.
If we use health_alarm_notify.conf from /usr/lib/netdata/conf.d/, our settings would be overwritten during updates, requiring us to <b>reconfigure</b> everything.

Therefore, we'll use the custom settings approach (option 1) by copying the file to our preferred location.

```bash
sudo cp /usr/lib/netdata/conf.d/health_alarm_notify.conf /etc/netdata/
sudo nano /etc/netdata/health_alarm_notify.conf
```

This will create a new file that you can modify using the nano command.
Search for <b>SLACK_WEBHOOK_URL</b> using <b>Ctrl + W</b>.

Add the <b>Webhook URL you received from Slack</b> to the SLACK_WEBHOOK_URL field.
Set <b>DEFAULT_RECIPIENT_SLACK</b> to the channel name you configured with the webhook.

It should look like this:

<br>

<img src="/setting-up-netdata/health-alarm-notify.png" alt="health-alarm-notify" align="center" />

<br>

After making these changes, save with <b>Ctrl + O</b> and exit with <b>Ctrl + X</b>.
Then restart the Netdata server using `sudo systemctl restart netdata`.

Once you run the following command, a test message will be sent to your Slack channel.

```bash
sudo /usr/libexec/netdata/plugins.d/alarm-notify.sh test slack
```

<br>

<img src="/setting-up-netdata/test-slack.png" alt="test-slack" align="center" />

<br>
<br>

## Setting Memory Thresholds
The main goal of all these configurations was to receive Slack alerts when resource usage exceeds certain thresholds.
https://learn.netdata.cloud/docs/alerts-&-notifications/alert-configuration-reference

I followed all commands from the <b>official documentation</b> and verified that they work correctly.

<br>

According to the documentation, we need to create a health.d/ram-usage.conf file.

In my case, I created the file at <b>/etc/netdata/health.d/ram-usage.conf</b> using the following commands:

```bash
sudo nano /etc/netdata/health.d/ram-usage.conf

### Please, enter the following settings.
alarm: ram_usage
    on: system.ram
lookup: average -1m percentage of used
 units: %
 every: 1m
  warn: $this > 60
  crit: $this > 90
  info: The percentage of RAM being used by the system.
###
```

After saving the configuration, reload the health settings using the following command:

```bash
sudo netdatacli reload-health
```

After that, you’ll see a message appear in Slack, as shown below.

<img src="/setting-up-netdata/ram-usage.png" alt="ram-usage" align="center" />

<br>

This completes all the necessary configurations.
With these settings in place, we can now monitor and utilize our server resources more efficiently.