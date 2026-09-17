---
title:
  ko: "Gitlab Runner 개선기"
  en: "Rebuilding Our GitLab Runner: BuildKit, Local Caching, and NVMe"
excerpt:
  ko: "느려진 GitLab CI를 Kaniko에서 BuildKit으로, 캐시 전략과 디스크 구조까지 바꿔가며 개선한 기록입니다."
  en: "A record of speeding up our GitLab CI by moving from Kaniko to BuildKit and reworking caching and disk layout."
date: "2026-09-17"
category:
  ko: "Infra"
  en: "Infra"
tags: ["Infra", "CI/CD", "GitLab", "Docker", "BuildKit"]
slug: "gitlab-runner"
---

# 배경

저희 팀은 프론트엔드(web, admin)와 백엔드를 각각 별도 저장소로 두고 GitLab CI로 빌드하고 있습니다. 

**기존에는 Gitlab Runner 는 AWS EC2 를 활용하여 서버에 runner 를 세팅하여 진행**하였었습니다.

<br>



백엔드는 여러 서비스가 함께 있는 모노레포 구조였고, 소스가 자주 바뀌는 환경이다 보니 빌드 캐시가 잘 붙지않았습니다. Runner를 5대나 띄워두고도 빌드는 여전히 느렸고, Kaniko 특성상 캐시는 무용지물이었습니다.

이 시점에 개선해야겠다고 생각이 들었고, **새로운 온프로미스 환경의 서버를 요청하였고, 할당받아 새로 세팅하게 되었습니다.**

<br>



이번 글에서는 **Kaniko에서 BuildKit으로 전환한 과정부터 Runner 구성, 캐시 전략, 디스크 구조까지 변경한 내용을 정리**합니다.

<br>



# 온프로미스 서버 이전

## Kaniko에서 moby/buildkit으로

Kaniko는 원래 docker in docker의 보안 문제를 피하기 위해 도입했습니다. 여기서 문제는 캐시 조회 방식이었습니다. 

**Kaniko는 레이어 캐시를 순서대로 조회하다가 한 단계에서라도 miss가 나면, 그 뒤에 있는 레이어는 애초에 캐시가 있어도 조회 자체를 건너뜁니다.**

<br>



커밋마다 소스 변경이 잦다 보니 초반 레이어에서 miss가 나는 일이 잦았고, 그러면 뒤에 캐시가 남아 있어도 소용이 없었습니다. Registry 캐시를 제대로 활용하지 못했습니다.

**이 구조적인 한계를 해결하기보다는 도구를 바꾸는 쪽을 택해서 moby/buildkit으로 교체했습니다.**

<br>



## Runner 줄이고 동시 실행 갯수 올리기

기존에는 Runner를 5대 등록해 운영했습니다. 그런데 GitLab Runner는 하나의 Runner로도 `concurrent` 옵션으로 여러 Job을 동시에 처리할 수 있습니다.

그래서 굳이 5대를 따로 둘 이유가 없었습니다. Runner는 1대만 남기고 concurrency를 8로 설정해 동시 처리 개수를 늘렸습니다. 

<br>



성능 자체가 크게 달라진 건 아니었지만, 등록과 설정을 5곳에서 관리하던 걸 1곳으로 줄일 수 있었습니다.

<br>



## 캐시를 로컬에 두기로 한 이유

기존에는 **Kaniko 레이어 캐시를 Registry에 올려두고 받아오는 방식**이었습니다. 이걸 BuildKit의 로컬 레이어 캐시로 바꾸면서 저장 위치도 같이 정리했습니다. pnpm이나 Next.js 캐시도 같은 방식으로 Runner 서버 로컬에 저장하도록 했습니다.

 Registry에 캐시를 올리고 받아오던 **네트워크 왕복이 사라지면서, 그만큼 대기 시간이 줄었습니다.**

<br>



## Prepare Step 추가

`pnpm install`처럼 캐시로 재사용하는 작업이 여러 Job에서 동시에 병렬로 실행됐습니다. 서로 캐시를 남기고 쓰는 타이밍이 꼬였고, 캐시 hit이 제대로 나지 않았습니다.

그래서 별도의 Prepare 단계를 만들었습니다. 여기서 먼저 의존성을 받아 캐싱해두고, 이후 실행되는 다른 Job들은 그 캐시를 그대로 쓰도록 순서를 정리했습니다.

<br>



## HDD I/O 병목 확인

여기까지 정리하고도 CI 실행 결과가 예상만큼 크게 개선되지 않았습니다. 그래서 서버 지표를 살펴보니 HDD(sdb) 쪽 `%util`이 거의 100%에 붙어 있었습니다.

**캐시와 빌드 작업이 여전히 HDD를 거쳤고, write await도 수십 ms까지 올라가는 구간이 보였습니다.** 

<br>



Docker의 data-root, BuildKit 캐시, GitLab 캐시, `/builds` **작업 공간을 전부 SSD 계열인 NVMe(nvme0n1)로 옮겼습니다**. 

이후 같은 구간에서 NVMe의 write await는 1~2ms 수준으로 낮게 유지됐습니다.

<br>



## 루트(/) 디스크도 HDD에서 SSD로

이후 runner 를 지켜보면서 느려지는 현상을 발견하였습니다. 

이미 CI 관련 작업을 NVMe로 다 옮긴 뒤임에도 불구하고, **iowait가 10% 안팎으로 튀고, 그렇게 대기 상태로 멈춰 있는 프로세스 수를 나타내는 load average가 7까지 올라가는 현상이 남았습니다.**

<br>



**원인을 찾아보니 정작 OS 루트(/)가 HDD(sdb) 위에 그대로 있었습니다**. 크기는 작아도 자주 쓰기가 걸리는 작업들이 전부 이 HDD를 거쳤습니다. 

즉, ext4 저널, journald, dockerd/containerd 상태 파일처럼 fsync가 걸리는 부분들이 존재했고, **이 구간의 write await는 30~200ms, `%util`은 100%까지 나왔습니다.**

<br>



SSD로 LVM PV를 추가하고 `pvmove`로 root LV를 옮겼습니다.

LVM을 쓴 덕분에 재부팅이나 Runner 중단 없이 작업을 끝냈습니다. 부트로더 설정도 따로 건드릴 필요가 없었습니다. 

<br>



**작업 후 root의 write await는 0.7ms, load average는 0.5까지 내려갔습니다.** `/boot`는 애초에 쓰기가 거의 없는 영역이라 그대로 HDD에 남겨뒀습니다.

<br>



# 결과

세 가지 저장소를 기준으로 quality 빌드와 build-and-deploy 시간을 전후로 비교했습니다.

| 저장소 | 작업 | 이전 | 이후 |
|---|---|---|---|
| Frontend-web | quality 빌드 | 11분 | 1분 |
| Frontend-web | build and deploy | 9분 | 1분 40초 |
| Frontend-admin | quality 빌드 | 2분 | 30초 |
| Frontend-admin | build and deploy | 11분 | 1분 |
| Backend | quality 빌드 | 4분 30초 | 1분 |
| Backend | build and deploy | 11분 | 3분 |

<br>



# 마무리

기존 Gitlab Runner 에서 너무 느려 팀원들의 능률이 떨어져 최대한 빠르게 세팅하는게 목표였고, 그 목표를 이룰 수 있어 정말 좋았습니다.

<br>



하지만 돌아보면 어느 한 가지만 바꿔서 해결된 문제는 아니었습니다. 

캐시 도구를 바꾸고, Runner 구성을 정리하고, 캐시 저장 위치를 옮기고, 마지막엔 디스크 배치까지 손댄 뒤에야 병목이 하나씩 풀렸습니다. 

특히 루트 디스크가 HDD에 있다는 건 지표를 자세히 들여다보기 전까지는 의심하기 어려웠고, 결국 가장 근본적인 원인 중 하나였습니다.

<br>



CI가 느리다고 느껴진다면 빌드 도구나 캐시 설정만 볼 게 아니라 **Runner가 올라가 있는 서버의 디스크 I/O까지 한 번은 확인해보시길 권합니다.**

<br>



---language-separator---



# Background

Our team keeps frontend (web, admin) and backend in separate repositories and builds them with GitLab CI.

**We used to run GitLab Runner by setting up runners on servers we provisioned on AWS EC2.**

<br>



The backend was a monorepo of multiple services, and since the source changed frequently, the build cache rarely stuck. Even with five Runners running, builds were still slow, and Kaniko's caching behavior made the cache practically useless.

At that point we decided it was time to improve things, **so we requested a new on-premise server, got one allocated, and set it up from scratch.**

<br>



This post walks through what we changed: **from switching Kaniko to BuildKit, to reworking the Runner setup, the caching strategy, and eventually the disk layout.**

<br>



# Migrating to an On-Premise Server

## From Kaniko to moby/buildkit

We originally adopted Kaniko to avoid the security issues of docker-in-docker. The problem turned out to be how it handles cache lookups.

**Kaniko checks layer caches in order, and if even one layer misses, it skips checking the cache for every layer after that, even if a cache exists for them.**

<br>



Since the source changed on nearly every commit, an early layer would miss often, making the caches further down useless. We weren't getting much value out of the registry cache.

**Rather than work around this limitation, we replaced the tool itself with moby/buildkit.**

<br>



## Reducing Runners and Raising Concurrency

We had been running five registered Runners. But a single GitLab Runner can already process multiple jobs at once through the `concurrent` option.

So there was no real reason to keep five separate ones. We kept a single Runner and set concurrency to 8.

<br>



Performance itself didn't change much, but we went from managing registration and configuration in five places down to one.

<br>



## Why We Moved the Cache Locally

We used to **push the Kaniko layer cache to a registry and pull it back down.** We replaced that with BuildKit's local layer cache and reorganized where things were stored. pnpm and Next.js caches were moved to local storage on the Runner server the same way.

The network round trip of pushing and pulling the cache to the registry **disappeared, and the wait time dropped by that much.**

<br>



## Adding a Prepare Step

Steps like `pnpm install`, which should be cacheable, were running in parallel across multiple jobs at the same time. That timing overlap meant the cache wasn't reliably hit.

We introduced a separate prepare step that downloads and caches dependencies first, so the jobs that run afterward can just reuse that cache instead of racing each other.

<br>



## Finding an HDD I/O Bottleneck

Even after all of this, CI results didn't improve as much as we expected. So we looked at server metrics and found `%util` on the HDD (`sdb`) sitting near 100%.

**Cache and build traffic was still passing through the HDD, and write await was spiking into the tens of milliseconds.**

<br>



We moved Docker's data-root, the BuildKit cache, the GitLab cache, and the `/builds` **workspace to an NVMe SSD (nvme0n1).**

Afterward, write await on the NVMe stayed around 1-2ms in the same window.

<br>



## Moving the Root (/) Disk from HDD to SSD

Even after that, we kept watching the Runner and noticed it was still slowing down.

**Even with CI-related workloads already moved to NVMe, `iowait` still spiked to around 10%, and load average, which reflects the number of processes stuck waiting, climbed as high as 7.**

<br>



**We traced the cause to the OS root (`/`), which was still sitting on the HDD (`sdb`).** Small but frequent writes were all passing through that HDD.

In other words, there were fsync-triggered writes like the ext4 journal, journald, and dockerd/containerd state files, and **write await in that window reached 30-200ms, with `%util` hitting 100%.**

<br>



We added the SSD as an LVM PV and moved the root LV with `pvmove`.

Because of LVM, we finished without a reboot or any Runner downtime. We didn't need to touch the bootloader either.

<br>



**Afterward, write await on root dropped to 0.7ms, and load average settled at 0.5.** `/boot` sees almost no writes, so we left it on the HDD.

<br>



# Results

Here's how build times changed for three repositories, comparing quality builds and build-and-deploy jobs before and after.

| Repository | Job | Before | After |
|---|---|---|---|
| Frontend-web | Quality build | 11 min | 1 min |
| Frontend-web | Build and deploy | 9 min | 1 min 40 sec |
| Frontend-admin | Quality build | 2 min | 30 sec |
| Frontend-admin | Build and deploy | 11 min | 1 min |
| Backend | Quality build | 4 min 30 sec | 1 min |
| Backend | Build and deploy | 11 min | 3 min |

<br>



# Wrap-up

Our goal was simple: the old GitLab Runner setup was so slow it was dragging down the team's productivity, and we wanted to fix that as fast as we could. Getting there felt genuinely good.

<br>



Looking back, though, no single change fixed this on its own.

We had to swap the build tool, clean up the Runner setup, move where the cache lives, and eventually rework the disk layout before the bottlenecks cleared one by one.

The root disk sitting on an HDD was especially easy to miss until we looked closely at the metrics, and it turned out to be one of the most fundamental causes.

<br>



If CI feels slow, it's worth checking more than just the build tool or cache settings — **check the disk I/O on the machine running your Runner too.**

<br>
