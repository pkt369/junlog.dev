---
title:
  ko: "AWS SSM 가이드"
  en: "AWS Systems Manager (SSM) Guide"
excerpt:
  ko: "SSH 없이 EC2에 안전하게 접속하는 AWS SSM 설정 가이드"
  en: "A practical guide to accessing EC2 securely without SSH using AWS SSM"
date: "2026-05-21"
category:
  ko: "Infra"
  en: "Infra"
tags: ["Infra", "AWS", "SSM", "Systems Manager", "SSH"]
slug: "aws-ssm"
---

# 서론

기존에는 EC2에 접속할 때 SSH와 pem 키를 사용했습니다. 서버와 사용자가 늘어날수록 서버마다 키를 만들고, 전달하고, 회수하는 관리 포인트가 계속 늘어났습니다.
이런 문제를 해결하고자 AWS Systems Manager의 Session Manager를 채택하게 되었습니다.

AWS Systems Manager의 Session Manager를 사용하면 SSH 포트를 열지 않고도 브라우저나 AWS CLI에서 EC2에 접속할 수 있습니다. 접근 권한은 IAM으로 제어할 수 있고, pem 키를 직접 공유하지 않아도 됩니다.

<br>

# SSM 접속 구조

Session Manager로 EC2에 접속하려면 크게 두 가지가 준비되어야 합니다.

1. EC2 인스턴스가 Systems Manager에서 관리되는 상태여야 합니다.
2. 접속하는 개발자나 운영자에게 Session Manager 사용 권한이 있어야 합니다.

<br>

AWS 공식 문서 기준으로 EC2 인스턴스에는 SSM Agent가 설치되어 실행 중이어야 하고, `AmazonSSMManagedInstanceCore` 정책이 포함된 IAM Role이 필요합니다. CLI로 접속하려면 로컬 환경에 AWS CLI와 Session Manager plugin도 필요합니다.

<br>

# EC2 준비

## IAM Role 생성

AWS 콘솔에서 <b>IAM Role을 하나 생성</b>합니다.

- 콘솔 경로: IAM -> Roles -> Create role
- Trusted entity type: AWS service
- Use case: EC2
- 권한 정책: `AmazonSSMManagedInstanceCore`

예를 들어 Role 이름은 `EC2-SSM-Role`처럼 식별하기 쉽게 만들면 됩니다.

<br>

## EC2에 Role 붙이기

생성한 Role을 EC2 인스턴스에 연결합니다.

- EC2 -> Instances
- 인스턴스 선택
- Actions -> Security -> Modify IAM role
- 방금 만든 Role 선택

<img src="/aws-ssm/attach-iam-role-1.png" alt="Attach IAM role menu" align="center" />

<br>

<img src="/aws-ssm/attach-iam-role-2.png" alt="Select IAM role for EC2" align="center" />

<br>

## 연결 상태 확인

Role을 붙인 뒤 EC2 콘솔에서 인스턴스를 확인합니다.

- EC2 -> Instances -> 인스턴스 선택
- 하단 정보에서 `Managed by Systems Manager` 상태 확인
- 또는 Connect -> Session Manager 탭이 활성화되는지 확인

<img src="/aws-ssm/managed-by-ssm.png" alt="Managed by Systems Manager status" align="center" />

<br>

<img src="/aws-ssm/session-manager-tab.png" alt="Session Manager connect tab" align="center" />

<br>

바로 보이지 않는다면 다음을 확인합니다.

- IAM Role이 제대로 연결되어 있는지
- 인스턴스 안의 SSM Agent가 설치되어 실행 중인지
- 인스턴스가 인터넷 또는 NAT Gateway를 통해 Systems Manager 엔드포인트에 접근할 수 있는지
- 프라이빗 서브넷이라면 SSM 관련 VPC Endpoint를 구성했는지
- Role 연결 직후라면 몇 분 정도 기다린 뒤 다시 확인

<br>

# 개발자 계정 준비

Session Manager로 접속할 사용자에게도 권한이 필요합니다.

간단히 동작 여부만 확인할 때는 `AmazonSSMFullAccess`를 사용할 수 있지만, 운영 환경에 그대로 두면 권한이 과합니다. 테스트 후에는 바로 제거하고, 실제 운영에서는 필요한 액션만 허용하는 별도 정책을 만드는 편이 좋습니다. 최소한 세션을 시작하려면 `ssm:StartSession` 권한이 필요하고, CLI 세션을 정상적으로 열려면 세션 데이터 채널과 세션 종료/재개 권한도 함께 고려해야 합니다.

<br>

# 웹 콘솔에서 접속하기

EC2 콘솔에서 바로 접속할 수 있습니다.

- EC2 -> Instances
- 인스턴스 선택
- Connect
- Session Manager 탭 선택
- Connect 클릭

접속 후에는 일반 SSH 세션처럼 명령어를 실행할 수 있습니다.

```bash
bash
whoami
```

<img src="/aws-ssm/web-session-test.png" alt="Session Manager web console test" align="center" />

<br>

# CLI 접속 세팅

웹 콘솔이 아니라 터미널에서 접속하려면 AWS CLI와 Session Manager plugin이 필요합니다.

먼저 AWS CLI를 설치합니다.

```bash
brew install awscli
```

설치 확인:

```bash
aws --version
```

저는 안전을 위해 임시 자격 증명과 MFA를 사용하는 방식으로 진행하였습니다.

<br>

## CLI 접속 구조

AWS CLI를 위해 SSM 접속용 IAM User와 실제 접속 권한을 가진 IAM Role을 분리했습니다.

```text
junlog-dev access key
  -> MFA
  -> sts:AssumeRole로 임시 자격 증명 요청
  -> JUNLOG_SSM_SESSION_ROLE 임시 자격 증명
  -> ssm:StartSession
```

<b>junlog-dev-base</b>는 액세스 키를 보관하는 기본 프로필입니다. <b>junlog-ssm</b>은 이 기본 프로필로 로그인한 뒤 MFA 코드를 확인하고, SSM 접속 권한이 들어 있는 `JUNLOG_SSM_SESSION_ROLE`의 임시 자격 증명을 받아 사용하는 프로필입니다.
<b>액세스 키만으로는 EC2에 바로 접속할 수 없고, MFA 인증 후 IAM Role의 임시 권한을 받아야 SSM 세션을 시작할 수 있습니다.</b>

<br>

## IAM 리소스 역할

여기서 IAM 리소스의 역할은 다음과 같습니다.

| 리소스 | 역할 |
| --- | --- |
| <b>junlog-dev</b> | CLI에서 사용할 IAM User입니다. EC2, S3, RDS 같은 AWS 리소스 권한을 직접 주지 않습니다. |
| <b>JUNLOG_ASSUME_SSM_ROLE_ONLY</b> | `junlog-dev`가 `JUNLOG_SSM_SESSION_ROLE`의 임시 자격 증명을 받을 수 있게 해주는 정책입니다. <b>이름 그대로 임시 자격 증명을 요청하는 권한만 허용하고, 실제 SSM 접속 권한은 포함하지 않습니다.</b> |
| <b>JUNLOG_SSM_SESSION_ROLE</b> | Session Manager 접속 권한을 가진 IAM Role입니다. `junlog-dev`가 MFA 인증을 통과한 뒤 이 Role의 임시 자격 증명을 받으면, 그때부터 <b>AWS CLI는 이 Role의 임시 권한으로 SSM 세션을 시작합니다.</b> |
| <b>JUNLOG_SSM_SESSION_MANAGER_ACCESS</b> | `JUNLOG_SSM_SESSION_ROLE`에 붙는 정책입니다. `ssm:StartSession`, 세션 데이터 채널, 세션 종료/재개, 인스턴스 조회에 필요한 권한만 포함합니다. |

즉, <b>junlog-dev</b>의 액세스 키는 로그인 수단이고, <b>JUNLOG_ASSUME_SSM_ROLE_ONLY</b>는 SSM 접속용 임시 자격 증명을 요청할 수 있게 해주는 정책입니다.
실제 EC2 접속 권한은 <b>JUNLOG_SSM_SESSION_ROLE</b>이 가지고 있습니다.

<br>

## 정책 예시

<details>
<summary><code>JUNLOG_ASSUME_SSM_ROLE_ONLY</code></summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAssumeJunlogSsmSessionRole",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::<account-id>:role/JUNLOG_SSM_SESSION_ROLE"
    }
  ]
}
```

</details>

<details>
<summary><code>JUNLOG_SSM_SESSION_ROLE</code> Trust policy</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<account-id>:user/junlog-dev"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}
```

</details>

<details>
<summary><code>JUNLOG_SSM_SESSION_MANAGER_ACCESS</code></summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowStartSsmSessions",
      "Effect": "Allow",
      "Action": "ssm:StartSession",
      "Resource": [
        "arn:aws:ec2:*:<account-id>:instance/*",
        "arn:aws:ssm:*::document/AWS-StartPortForwardingSession",
        "arn:aws:ssm:*:<account-id>:document/SSM-SessionManagerRunShell"
      ]
    },
    {
      "Sid": "AllowOpenSessionDataChannel",
      "Effect": "Allow",
      "Action": "ssmmessages:OpenDataChannel",
      "Resource": "arn:aws:ssm:*:<account-id>:session/${aws:userid}-*"
    },
    {
      "Sid": "AllowManageOwnSsmSessions",
      "Effect": "Allow",
      "Action": [
        "ssm:TerminateSession",
        "ssm:ResumeSession"
      ],
      "Resource": "arn:aws:ssm:*:<account-id>:session/${aws:userid}-*"
    },
    {
      "Sid": "AllowDescribeForSessionTargetDiscovery",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ssm:DescribeInstanceInformation",
        "ssm:GetConnectionStatus",
        "ssm:DescribeSessions"
      ],
      "Resource": "*"
    }
  ]
}
```

</details>

<br>

<img src="/aws-ssm/iam-junlog-dev.png" alt="IAM" align="center" />

<br>

## AWS CLI 프로필 설정

`~/.aws/credentials`:

```ini
[junlog-dev-base]
aws_access_key_id = <access-key-id>
aws_secret_access_key = <secret-access-key>
```

`~/.aws/config`:

```ini
[profile junlog-dev-base]
region = ap-northeast-2
output = json

[profile junlog-ssm]
role_arn = arn:aws:iam::<account-id>:role/JUNLOG_SSM_SESSION_ROLE
source_profile = junlog-dev-base
mfa_serial = arn:aws:iam::<account-id>:mfa/junlog-dev
region = ap-northeast-2
output = json
```

AWS CLI는 MFA 코드를 입력받아 STS 임시 자격 증명을 발급받고, 이를 `~/.aws/cli/cache`에 일정 시간 캐시합니다.

<br>

설정 후 먼저 프로필이 올바른 IAM 사용자로 인식되는지 확인합니다.

```bash
aws sts get-caller-identity --profile junlog-dev-base
```

그 다음 `junlog-ssm` 프로필이 SSM 접속용 임시 자격 증명을 받을 수 있는지 확인합니다.

```bash
aws sts get-caller-identity --profile junlog-ssm
```

이때 MFA 코드를 입력합니다. 결과 ARN이 `arn:aws:sts::<account-id>:assumed-role/JUNLOG_SSM_SESSION_ROLE/...` 형태라면 정상입니다.

<br>

## Session Manager plugin 설치

macOS Apple silicon 기준으로는 다음처럼 설치할 수 있습니다.

```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac_arm64/session-manager-plugin.pkg" -o "session-manager-plugin.pkg"
sudo installer -pkg session-manager-plugin.pkg -target /
sudo ln -s /usr/local/sessionmanagerplugin/bin/session-manager-plugin /usr/local/bin/session-manager-plugin
```

설치 확인:

```bash
session-manager-plugin
```

정상 설치되었다면 다음과 비슷한 메시지가 나옵니다.

```text
The Session Manager plugin is installed successfully. Use the AWS CLI to start a session.
```

<br>

# CLI로 접속하기

먼저 SSM에서 관리 중인 인스턴스를 확인합니다.

```bash
aws ssm describe-instance-information --profile junlog-ssm
```

접속할 인스턴스 ID를 확인한 뒤 세션을 시작합니다.

```bash
aws ssm start-session --target <instance-id> --profile junlog-ssm
```

자주 접속하는 인스턴스라면 alias로 등록해두면 편합니다.

```bash
echo "
alias ssm-dev='aws ssm start-session --target <dev-instance-id> --profile junlog-ssm'
alias ssm-prod='aws ssm start-session --target <prod-instance-id> --profile junlog-ssm'
" >> ~/.zshrc

source ~/.zshrc
```

<br>

# 포트 포워딩

로컬에서 EC2 내부의 특정 포트에 접근해야 할 때는 Session Manager의 포트 포워딩을 사용할 수 있습니다.

포트 포워딩을 사용하려면 대상 인스턴스의 SSM Agent가 해당 기능을 지원하는 버전이어야 합니다. 오래된 AMI를 사용 중이라면 SSM Agent를 최신 버전으로 업데이트한 뒤 진행하는 편이 안전합니다.

<br>

예를 들어 EC2 안에서만 접근 가능한 `5432` 포트를 로컬 `15432`로 연결하려면 다음처럼 실행합니다.

```bash
aws ssm start-session \
  --target <instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["15432"]}' \
  --profile junlog-ssm
```

이후 로컬에서는 `localhost:15432`로 접근하면 됩니다.


<br>

# 트러블슈팅

## aws --version 실행 시 Python/expat 오류

Homebrew로 `awscli`를 설치한 뒤 `aws --version` 실행 시 Python의 `pyexpat` 관련 오류가 발생할 수 있습니다. 이 경우 Homebrew 패키지 재설치를 먼저 시도해볼 수 있습니다.

```bash
brew update
brew upgrade

brew reinstall expat
brew reinstall python
brew reinstall awscli

brew cleanup

aws --version
```

그래도 해결되지 않으면 Homebrew 버전 대신 AWS 공식 pkg 설치 방식을 사용할 수 있습니다.

```bash
brew uninstall awscli

curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "/tmp/AWSCLIV2.pkg"
sudo installer -pkg /tmp/AWSCLIV2.pkg -target /

which aws
aws --version
```

<br>

## Session Manager 탭이 비활성화되는 경우

다음을 순서대로 확인합니다.

- EC2에 `AmazonSSMManagedInstanceCore` 권한이 포함된 IAM Role이 붙어 있는지
- 인스턴스 안의 SSM Agent가 실행 중인지
- 인스턴스가 Systems Manager 엔드포인트에 접근 가능한 네트워크에 있는지
- 접속하는 사용자에게 `ssm:StartSession` 권한이 있는지
- Role을 방금 붙였다면 몇 분 뒤 다시 확인했는지

<br>

# 참고 문서

- [AWS Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [Complete Session Manager prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)
- [Sample IAM policies for Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [Connect to your Amazon EC2 instance using Session Manager](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-systems-manager-session-manager.html)
- [Install the Session Manager plugin on macOS](https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-macos-overview.html)
- [Start a session](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)

---language-separator---

# Introduction

Previously, I used SSH and pem keys to access EC2 instances. As the number of servers and users grew, the number of management points kept increasing: creating keys for each server, sharing them, and revoking them.
To solve this problem, I adopted AWS Systems Manager Session Manager.

With AWS Systems Manager Session Manager, you can access EC2 from a browser or AWS CLI without opening the SSH port. Access can be controlled through IAM, and you do not need to share pem keys directly.

<br>

# How SSM Access Works

To connect to EC2 through Session Manager, two things must be prepared.

1. The EC2 instance must be managed by Systems Manager.
2. The developer or operator must have permission to use Session Manager.

According to the AWS documentation, the EC2 instance must have SSM Agent installed and running, and it needs an IAM Role that includes the `AmazonSSMManagedInstanceCore` policy. If you want to connect through the CLI, your local machine also needs AWS CLI and the Session Manager plugin.

<br>

# Prepare EC2

## Create an IAM Role

Create an IAM Role in the AWS console.

- Console path: IAM -> Roles -> Create role
- Trusted entity type: AWS service
- Use case: EC2
- Permission policy: `AmazonSSMManagedInstanceCore`

For example, you can name it something easy to identify, such as `EC2-SSM-Role`.

<br>

## Attach the Role to EC2

Attach the Role to the EC2 instance.

- EC2 -> Instances
- Select the instance
- Actions -> Security -> Modify IAM role
- Select the Role you created

<img src="/aws-ssm/attach-iam-role-1.png" alt="Attach IAM role menu" align="center" />

<br>

<img src="/aws-ssm/attach-iam-role-2.png" alt="Select IAM role for EC2" align="center" />

<br>

## Check the Connection Status

After attaching the Role, check the instance in the EC2 console.

- EC2 -> Instances -> Select the instance
- Check whether it is marked as `Managed by Systems Manager`
- Or check whether the Connect -> Session Manager tab is enabled

<img src="/aws-ssm/managed-by-ssm.png" alt="Managed by Systems Manager status" align="center" />

<br>

<img src="/aws-ssm/session-manager-tab.png" alt="Session Manager connect tab" align="center" />

<br>

If it does not appear immediately, check the following.

- Whether the IAM Role is attached correctly
- Whether SSM Agent is installed and running inside the instance
- Whether the instance can access Systems Manager endpoints through the internet or a NAT Gateway
- If the instance is in a private subnet, whether the required SSM VPC Endpoints are configured
- If you just attached the Role, wait a few minutes and check again

<br>

# Prepare the Developer Account

The user who connects through Session Manager also needs permissions.

For a quick connectivity test, you can use `AmazonSSMFullAccess`, but it is too broad to leave in production. Remove it after testing, and create a separate policy that only allows the required actions. At minimum, starting a session requires `ssm:StartSession`. For CLI sessions to work correctly, you should also consider the session data channel and the permissions to terminate or resume sessions.

<br>

# Connect from the Web Console

You can connect directly from the EC2 console.

- EC2 -> Instances
- Select the instance
- Connect
- Select the Session Manager tab
- Click Connect

After connecting, you can run commands as you would in a normal SSH session.

```bash
bash
whoami
```

<img src="/aws-ssm/web-session-test.png" alt="Session Manager web console test" align="center" />

<br>

# Set Up CLI Access

To connect from the terminal instead of the web console, you need AWS CLI and the Session Manager plugin.

First, install AWS CLI.

```bash
brew install awscli
```

Check the installation:

```bash
aws --version
```

For safety, this guide uses temporary credentials with MFA.

<br>

## CLI Access Structure

The CLI setup separates the IAM User used for local credentials from the IAM Role that has the actual SSM permissions.

```text
junlog-dev access key
  -> MFA
  -> request temporary credentials with sts:AssumeRole
  -> temporary credentials for JUNLOG_SSM_SESSION_ROLE
  -> ssm:StartSession
```

`junlog-dev-base` is the base profile that stores the access key. `junlog-ssm` uses that base profile, asks for an MFA code, and then uses temporary credentials from `JUNLOG_SSM_SESSION_ROLE`, the role that has SSM access. The access key alone cannot start an EC2 session.

<br>

## IAM Resource Roles

The IAM resources in this setup have the following roles.

| Resource | Role |
| --- | --- |
| <b>junlog-dev</b> | The IAM User used by the CLI. It is not given direct permissions to AWS resources such as EC2, S3, or RDS. |
| <b>JUNLOG_ASSUME_SSM_ROLE_ONLY</b> | A policy that lets `junlog-dev` receive temporary credentials for `JUNLOG_SSM_SESSION_ROLE`. <b>As the name suggests, it only allows requesting temporary credentials and does not include the actual SSM access permissions.</b> |
| <b>JUNLOG_SSM_SESSION_ROLE</b> | The IAM Role with Session Manager access. After `junlog-dev` passes MFA authentication and receives temporary credentials for this Role, <b>AWS CLI starts SSM sessions using this Role's temporary permissions.</b> |
| <b>JUNLOG_SSM_SESSION_MANAGER_ACCESS</b> | The policy attached to `JUNLOG_SSM_SESSION_ROLE`. It only includes the permissions required for `ssm:StartSession`, the session data channel, session termination/resume, and instance lookup. |

In short, the <b>junlog-dev</b> access key is the login mechanism, and <b>JUNLOG_ASSUME_SSM_ROLE_ONLY</b> is the policy that allows requesting temporary credentials for SSM access.
The actual EC2 access permission belongs to <b>JUNLOG_SSM_SESSION_ROLE</b>.

<br>

## Policy Examples

<details>
<summary><code>JUNLOG_ASSUME_SSM_ROLE_ONLY</code></summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAssumeJunlogSsmSessionRole",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::<account-id>:role/JUNLOG_SSM_SESSION_ROLE"
    }
  ]
}
```

</details>

<details>
<summary><code>JUNLOG_SSM_SESSION_ROLE</code> trust policy</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<account-id>:user/junlog-dev"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}
```

</details>

<details>
<summary><code>JUNLOG_SSM_SESSION_MANAGER_ACCESS</code></summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowStartSsmSessions",
      "Effect": "Allow",
      "Action": "ssm:StartSession",
      "Resource": [
        "arn:aws:ec2:*:<account-id>:instance/*",
        "arn:aws:ssm:*::document/AWS-StartPortForwardingSession",
        "arn:aws:ssm:*:<account-id>:document/SSM-SessionManagerRunShell"
      ]
    },
    {
      "Sid": "AllowOpenSessionDataChannel",
      "Effect": "Allow",
      "Action": "ssmmessages:OpenDataChannel",
      "Resource": "arn:aws:ssm:*:<account-id>:session/${aws:userid}-*"
    },
    {
      "Sid": "AllowManageOwnSsmSessions",
      "Effect": "Allow",
      "Action": [
        "ssm:TerminateSession",
        "ssm:ResumeSession"
      ],
      "Resource": "arn:aws:ssm:*:<account-id>:session/${aws:userid}-*"
    },
    {
      "Sid": "AllowDescribeForSessionTargetDiscovery",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ssm:DescribeInstanceInformation",
        "ssm:GetConnectionStatus",
        "ssm:DescribeSessions"
      ],
      "Resource": "*"
    }
  ]
}
```

</details>

<br>

## AWS CLI Profile Configuration

`~/.aws/credentials`:

```ini
[junlog-dev-base]
aws_access_key_id = <access-key-id>
aws_secret_access_key = <secret-access-key>
```

`~/.aws/config`:

```ini
[profile junlog-dev-base]
region = ap-northeast-2
output = json

[profile junlog-ssm]
role_arn = arn:aws:iam::<account-id>:role/JUNLOG_SSM_SESSION_ROLE
source_profile = junlog-dev-base
mfa_serial = arn:aws:iam::<account-id>:mfa/junlog-dev
region = ap-northeast-2
output = json
```

AWS CLI prompts for an MFA code, issues temporary STS credentials, and caches them under `~/.aws/cli/cache` for a certain amount of time.

<br>

After setting this up, first check whether the profile is recognized as the correct IAM user.

```bash
aws sts get-caller-identity --profile junlog-dev-base
```

Then check whether the `junlog-ssm` profile can receive temporary credentials for SSM access.

```bash
aws sts get-caller-identity --profile junlog-ssm
```

Enter the MFA code at this point. If the resulting ARN has the form `arn:aws:sts::<account-id>:assumed-role/JUNLOG_SSM_SESSION_ROLE/...`, it is working correctly.

<br>

## Install the Session Manager Plugin

For macOS Apple silicon, you can install it as follows.

```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac_arm64/session-manager-plugin.pkg" -o "session-manager-plugin.pkg"
sudo installer -pkg session-manager-plugin.pkg -target /
sudo ln -s /usr/local/sessionmanagerplugin/bin/session-manager-plugin /usr/local/bin/session-manager-plugin
```

Verify the installation:

```bash
session-manager-plugin
```

If the installation succeeded, you should see a message similar to this.

```text
The Session Manager plugin is installed successfully. Use the AWS CLI to start a session.
```

<br>

# Connect from the CLI

First, check the instances managed by SSM.

```bash
aws ssm describe-instance-information --profile junlog-ssm
```

After finding the target instance ID, start a session.

```bash
aws ssm start-session --target <instance-id> --profile junlog-ssm
```

If you frequently connect to specific instances, aliases are convenient. Replace the instance IDs with values from your own environment.

```bash
echo "
alias ssm-dev='aws ssm start-session --target <dev-instance-id> --profile junlog-ssm'
alias ssm-prod='aws ssm start-session --target <prod-instance-id> --profile junlog-ssm'
" >> ~/.zshrc

source ~/.zshrc
```

<br>

# Port Forwarding

When you need to access a port inside EC2 from your local machine, you can use Session Manager port forwarding.

Port forwarding requires an SSM Agent version that supports the feature. If you are using an old AMI, update SSM Agent before relying on port forwarding.

For example, the following command maps port `5432` inside EC2 to local port `15432`.

```bash
aws ssm start-session \
  --target <instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["15432"]}' \
  --profile junlog-ssm
```

After the session starts, connect to `localhost:15432` from your local machine.

<br>

# Troubleshooting

## Python/expat Error When Running `aws --version`

After installing `awscli` with Homebrew, you might see a Python `pyexpat` related error when running `aws --version`. In that case, try reinstalling the Homebrew packages first.

```bash
brew update
brew upgrade

brew reinstall expat
brew reinstall python
brew reinstall awscli

brew cleanup

aws --version
```

If that does not solve the issue, install AWS CLI using the official AWS pkg installer instead of the Homebrew package.

```bash
brew uninstall awscli

curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "/tmp/AWSCLIV2.pkg"
sudo installer -pkg /tmp/AWSCLIV2.pkg -target /

which aws
aws --version
```

<br>

## Session Manager Tab Is Disabled

Check the following in order.

- Whether the EC2 instance has an IAM Role with `AmazonSSMManagedInstanceCore`
- Whether the SSM Agent is running inside the instance
- Whether the instance can access Systems Manager endpoints
- Whether the connecting user has `ssm:StartSession` permission
- Whether you waited a few minutes after attaching the Role

<br>

# References

- [AWS Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [Complete Session Manager prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)
- [Sample IAM policies for Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [Connect to your Amazon EC2 instance using Session Manager](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-systems-manager-session-manager.html)
- [Install the Session Manager plugin on macOS](https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-macos-overview.html)
- [Start a session](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)
