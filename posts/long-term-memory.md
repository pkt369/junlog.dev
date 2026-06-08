---
title:
  ko: "RAG 적용 후기: 캐릭터 장기기억 구현하기"
  en: "RAG Experience: Building Long-Term Memory for Characters"
excerpt:
  ko: "RAG를 활용해 캐릭터가 이전 대화를 기억하도록 구현한 과정과 시행착오를 정리했습니다."
  en: "A practical write-up on using RAG to help characters remember previous conversations."
date: "2026-06-05"
category:
  ko: "Backend"
  en: "Backend"
tags: ["RAG", "LLM", "AI", "Embedding", "Vector Search"]
slug: "long-term-memory"
---

# 서론

기존 캐릭터 챗봇 서비스에서는 캐릭터가 이전 대화를 유지하기 위해 많은 대화 턴수를 LLM에 함께 전달해야 했습니다. 이러다 보니 정해진 턴 수를 넘어가면 오래된 대화를 기억하지 못하는 문제가 있었고, 토큰 사용량도 많아져 비용 측면에서도 부담이 있었습니다.

이러한 문제를 해결하기위해 RAG 를 도입하기로 하였습니다.

<br>

# RAG 란 무엇인가

RAG는 **Retrieval-Augmented Generation**의 줄임말로, 검색 증강 생성이라고 불립니다.
쉽게 말하면 **LLM이 바로 답변하지 않고 먼저 관련 문서나 기억을 검색한 뒤, 그 내용을 참고해서 답변하게 만드는 방식**입니다.

캐릭터 챗봇 서비스에서는 이전 대화 내용을 검색해 캐릭터가 과거의 대화를 기억하는 것처럼 응답할 수 있습니다. 이번에는 이러한 장기기억 구조를 구현하기 위해 Vector DB인 Qdrant를 적용했습니다.

<br>

# 이번 글 범위
저는 백엔드 개발자로서 RAG의 연구나 검색 전략 자체보다는 **백엔드 연동, 아키텍처 설계, 시스템 구축을 담당**했습니다.

채팅 서버, Python 서버, Vector DB, LLM 호출 흐름을 연결해 실제 서비스 흐름 안에서 장기기억 기능이 동작하도록 구성했습니다.
따라서 이번 글에서는 RAG의 검색 전략을 깊게 다루기보다는, **캐릭터 장기기억 기능을 백엔드 시스템에 어떻게 연결하고 구축했는지에 초점을 맞추겠습니다.**

<br>


# 설계
## 아키텍처
먼저 아키텍처는 아래와 같습니다.
<img src="/long-term-memory/long_term_memory_kr.png" alt="long-term-memory-architecture" align="center" height="550" />

<br>

## 최근 기억과 장기기억 분리

장기기억을 구현할 때 모든 대화를 같은 방식으로 다루지는 않았습니다.

최근 대화는 현재 대화 맥락을 유지하는 데 중요하고, 오래된 대화는 필요한 순간에 다시 꺼내 쓰는 기억에 가깝습니다. 따라서 최근 대화는 별도로 유지하고, 오래된 대화는 요약과 검색을 통해 필요한 내용만 LLM에 전달하는 방식으로 구성했습니다.

이렇게 분리하여 **LLM에 모든 대화를 전달하지 않아도 현재 맥락과 과거 기억을 함께 사용할 수 있었습니다.**

<br>

## 검색 순서
검색 순서는 아래와 같습니다.
1. 유저가 채팅한다.
2. 필요한 전처리 작업을 하고 최근 대화를 가져온다.
3. 백엔드에서 채팅 데이터를 Python 서버로 전송한다.
4. Python 서버에서 채팅 데이터를 임베딩한다.
5. 앞서 받은 임베딩값으로 Vector DB 에서 조회한다.
6. 검색 요약본와 최근 요약본을 백엔드로 반환한다.
7. 백엔드에선 최근 메세지 + 최근 요약본 + 검색 요약본을 LLM 에게 요청한다.
8. LLM 에서 받은값을 후처리 후 유저에게 전송한다.

<br>

정리하면, 대화량이 많아질 경우 최근 대화를 먼저 요약하고, 일정 시간이 지나면 해당 요약본을 다시 장기기억용 요약본으로 정리하는 방식으로 구현했습니다.

즉, 모든 대화를 매번 LLM에 전달하는 대신 최근 맥락은 짧게 유지하고, 오래된 대화는 Vector DB에서 필요한 내용만 검색해 사용하는 구조입니다.

<br>

## 요약본 저장 순서
요약본 저장 순서는 아래와 같습니다.
1. 메세지가 일정 갯수 이상 쌓이면 백엔드에서 `startIndex`, `endIndex` 를 포함한 요약 작업 이벤트를 Kafka 토픽에 발행합니다.
2. Consumer 는 Kafka 토픽의 메세지를 읽고, 해당 대화의 `startIndex` ~ `endIndex` 범위에 해당하는 메세지를 디비에서 가져옵니다.
3. 가져온 메세지들을 LLM 에 전달해 최근 대화 요약본을 생성합니다.
4. 생성된 요약본을 Python 서버로 전달하고, Python 서버는 이를 LangGraph 의 checkpoint 저장소에 저장합니다.

<br>

비동기로 처리한 이유는 다음과 같습니다.
- 요약 작업을 채팅 응답과 분리해 응답시간을 줄일 수 있습니다.
- 실패한 요약 작업을 메세지 단위로 재처리하기 쉽습니다.

<br>

## 데일리 요약본 저장 순서
데일리 요약본 저장 순서는 다음과 같습니다.
1. 특정 시간이 되면 batch 가 동작하여 작업을 실행합니다.
2. batch 는 요약이 안된 최근 메세지들을 포함해 Python 서버로 요청합니다.
3. Python 서버는 요약이 안된 최근 메세지들과 LangGraph checkpoint 저장소에 있는 요약본을 함께 사용해 LLM 에게 데일리 요약을 요청합니다.
4. 생성된 데일리 요약본을 임베딩합니다.
5. 요약본 원문, 임베딩 값, 메타데이터를 Vector DB 에 저장합니다.

<br>

# 회고
장기기억 관련 경험이 없어 처음에는 두려움이 앞섰지만, Vector DB가 어떻게 동작하는지 공부하고 실제 서비스에 적용하면서 많이 배울 수 있었습니다.

**결과적으로 RAG를 사용하면서 LLM에 전달되는 토큰 사용량을 약 44% 줄일 수 있었고, 기존보다 훨씬 넓은 범위의 대화를 기억처럼 활용할 수 있게 되었습니다.**
하지만 RAG는 단순히 Vector DB를 붙인다고 끝나는 구조는 아니었습니다. 어떤 내용을 저장할지, 언제 요약할지, 검색된 내용을 LLM에 어떻게 전달할지에 따라 결과가 크게 달라질 수 있었습니다.

이번 경험을 통해 RAG에서 중요한 것은 검색 기술 자체만이 아니라, 어떤 데이터를 기억으로 남기고 어떤 맥락에서 다시 꺼내 쓸지 설계하는 과정이라는 것을 느꼈습니다.

앞으로는 검색 품질을 더 안정적으로 유지하기 위해 요약 품질, context 구성 방식, 검색 결과 평가 기준을 계속 개선해보고 싶습니다.



---language-separator---

# Introduction

In the existing character chatbot service, we had to pass many previous conversation turns to the LLM so that the character could maintain context. As a result, once the conversation exceeded a certain number of turns, older messages could no longer be remembered. Token usage also increased, which became a cost concern from a business perspective.

To solve this problem, we decided to introduce RAG.

<br>

# What Is RAG?

RAG stands for **Retrieval-Augmented Generation**.
In simple terms, it is a method where **the LLM does not generate an answer immediately, but first retrieves relevant documents or memories and then uses that information to generate a response**.

In a character chatbot service, RAG allows the character to retrieve previous conversations and respond as if it remembers the past. To build this long-term memory structure, we applied Qdrant as the Vector DB.

<br>

# Scope of This Post

As a backend developer, I was responsible for **backend integration, architecture design, and system implementation**, rather than RAG research or the search strategy itself.

I connected the chat server, Python server, Vector DB, and LLM call flow so that the long-term memory feature could work within the actual service flow.
Therefore, this post focuses less on the detailed RAG search strategy and more on **how the character long-term memory feature was connected and implemented in the backend system**.

<br>

# Design

## Architecture

The architecture is shown below.

<img src="/long-term-memory/long_term_memory_en.png" alt="long-term-memory-architecture" align="center" height="550" />

<br>

## Separating Recent Memory and Long-Term Memory

When implementing long-term memory, not every conversation was handled in the same way.

Recent conversations are important for maintaining the current context, while older conversations are closer to memories that should be retrieved only when needed. Therefore, recent conversations were kept separately, and older conversations were summarized and retrieved so that only the necessary information would be passed to the LLM.

By separating them this way, **we could use both the current context and past memories without passing every conversation to the LLM**.

<br>

## Search Flow

The search flow is as follows.

1. The user sends a chat message.
2. The backend performs the necessary preprocessing and retrieves recent conversations.
3. The backend sends the chat data to the Python server.
4. The Python server embeds the chat data.
5. The Vector DB is queried using the generated embedding.
6. The retrieved summary and recent summary are returned to the backend.
7. The backend sends the recent messages, recent summary, and retrieved summary to the LLM.
8. The LLM response is post-processed and sent back to the user.

<br>

In summary, when the amount of conversation increases, recent conversations are summarized first. After a certain point, those summaries are summarized again into long-term memory summaries.

In other words, instead of passing every conversation to the LLM every time, the system keeps the recent context short and retrieves only the necessary parts of older conversations from the Vector DB.

<br>

## Summary Storage Flow

The summary storage flow is as follows.

1. When a certain number of messages has accumulated, the backend publishes a summary job event containing `startIndex` and `endIndex` to a Kafka topic.
2. The Consumer reads the message from the Kafka topic and retrieves the messages in the `startIndex` ~ `endIndex` range from the database.
3. The retrieved messages are sent to the LLM to generate a recent conversation summary.
4. The generated summary is sent to the Python server, and the Python server stores it in the LangGraph checkpoint storage.

<br>

The reason for processing this asynchronously is as follows.

- The summary job is separated from the chat response flow, which helps reduce response time.
- Failed summary jobs can be retried more easily at the message level.

<br>

## Daily Summary Storage Flow

The daily summary storage flow is as follows.

1. At a specific time, a batch job runs.
2. The batch job sends a request to the Python server with recent messages that have not yet been summarized.
3. The Python server uses both the unsummarized recent messages and the summaries stored in LangGraph checkpoint storage to request a daily summary from the LLM.
4. The generated daily summary is embedded.
5. The summary text, embedding value, and metadata are stored in the Vector DB.

<br>

# Retrospective

At first, I felt some pressure because I had no prior experience with long-term memory. However, by studying how Vector DB works and applying it to a real service, I was able to learn a lot.

**As a result, by using RAG, we reduced the token usage passed to the LLM by about 44%, and we were able to use a much wider range of previous conversations as memory.**
However, RAG is not a structure that is finished simply by attaching a Vector DB. The result can vary greatly depending on what data is stored, when it is summarized, and how the retrieved information is passed to the LLM.

Through this experience, I realized that what matters in RAG is not only the search technology itself, but also the process of designing what data should remain as memory and in what context it should be retrieved again.

Going forward, I want to continue improving summary quality, context composition, and search result evaluation criteria to make the search quality more stable.
