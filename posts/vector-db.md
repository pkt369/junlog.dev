---
title:
  ko: "Vector Database 이해하기: 동작 방식과 검색 흐름"
  en: "Understanding Vector Databases: How They Work and Search"
excerpt:
  ko: "Vector Database가 데이터를 벡터로 저장하고 유사도 검색을 수행하는 방식"
  en: "How vector databases store data as vectors and perform similarity search"
date: "2026-06-09"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Database", "Vector Database", "Embedding", "Similarity Search", "ANN"]
slug: "vector-db"
---

# 서론

회사에서 RAG 를 붙이기로 결정이 나고 나서 자연스럽게 Vector DB 를 접하게 되었습니다.
개발자로서 무엇이든 적용하기 전에 자세히 알아야한다는 주의라 공부를 시작하게 되었고, 지식을 정리하고자 포스팅을 남기게 되었습니다.

<br>

# Vector 란 무엇인가

먼저 Vector 는 **데이터를 숫자 배열로 표현**한 것입니다. 
텍스트, 이미지, 오디오 같은 데이터를 임베딩을 하면 고차원의 벡터로 변환이 됩니다.

예시) 커피 => [0.12, -0.45, 0.47, ...]

이 배열의 숫자는 하나의 차원을 의미합니다.
**즉, 벡터는 데이터를 고차원에 배치하기 위한 좌표와 같습니다.**

<br>

의미가 비슷한 데이터는 벡터 공간에서 가까운 위치에 놓이게 됩니다.

참고) https://developers.openai.com/api/docs/guides/embeddings

<br>

# Vector Database 의 기본 동작 흐름

1. 필요한 데이터를 임베딩 모델에 넣어 벡터로 변환합니다.
2. Qdrant 같은 벡터 데이터베이스에 벡터와 메타데이터를 저장합니다.
3. 사용자의 검색어도 같은 방식으로 벡터로 변환합니다.
4. 저장된 벡터들과 비교해 가장 가까운 결과를 반환합니다.

<br>

이 흐름을 이해하려면 먼저 **임베딩**을 알아야 합니다.  
임베딩은 텍스트, 이미지, 오디오 같은 데이터를 의미를 담은 숫자 배열인 **벡터로 바꾸는 과정**입니다.  
이때 만들어진 벡터를 **임베딩 벡터**라고 부르고, 이 변환을 수행하는 모델을 **임베딩 모델**이라고 부릅니다.

아래에서 임베딩에서 대해서 조금 더 자세히 알아보겠습니다.

<br>

# Embedding Model 은 어떻게 벡터를 만들까?

임베딩 모델은 문장을 바로 벡터로 바꾸는 것이 아니라, 내부적으로 여러 단계를 거쳐 숫자 배열을 만듭니다.

1. **문장을 토큰으로 나눕니다.**
   - 이 작업을 토큰화(Tokenization)라고 하며, 토큰화를 수행하는 도구를 토크나이저(Tokenizer)라고 부릅니다.
   - 여기서 토큰은 단어일 수도 있고, 단어보다 작은 조각일 수도 있습니다.
2. **각 토큰을 숫자 ID로 바꿉니다.**
   - 토크나이저는 토큰 사전(Tokenizer Vocabulary)을 기준으로 각 토큰에 해당하는 숫자 ID를 찾습니다.
   - 예를 들어 "은행에 갔다"라는 문장은 `[3512, 48, 9021]` 같은 숫자 ID 배열로 바뀔 수 있습니다.

3. **모델은 숫자 ID를 벡터로 변환합니다.**
   - 각 토큰 ID는 임베딩 테이블을 거쳐 숫자 배열로 바뀝니다.
   - 예를 들어 `3512`라는 ID가 `[0.12, -0.31, 0.78, ...]` 같은 벡터로 변환됩니다.

4. **문맥을 반영해 최종 벡터를 만듭니다.**
   - 같은 "은행"이라는 단어라도 금융 기관을 의미할 수도 있고, 은행나무 열매를 의미할 수도 있습니다.
   - 임베딩 모델은 문장 안의 다른 토큰과의 관계를 계산해 문맥이 반영된 벡터를 만듭니다.

<br>

결과적으로 임베딩 모델은 문장이나 문서를 의미를 담은 숫자 배열, 즉 벡터로 변환합니다.

이 과정에는 Transformer의 Attention 같은 구조가 사용되기도 하지만, 이 글에서는 Vector Database의 검색 흐름을 이해하는 데 필요한 수준까지만 다루겠습니다.

<br>

# 벡터 데이터베이스에는 무엇이 저장될까?

벡터 데이터베이스에는 보통 다음과 같은 정보가 저장됩니다.

1. **id**
   - 각 데이터를 구분하기 위한 고유값입니다.

2. **vector**
   - 원문을 임베딩 모델에 넣어 만든 숫자 배열입니다.
   - 이 벡터끼리 비교해서 의미적으로 비슷한 데이터를 찾습니다.

3. **metadata**
   - 벡터에 대한 부가 정보입니다.
   - 예를 들어 `document_id`, `title`, `source`, `chunk_index` 같은 값이 들어갑니다.

4. **payload**
   - 검색 결과로 다시 보여줄 원문입니다.
   - 경우에 따라 원문을 직접 저장하지 않고, 원문이 있는 위치만 저장하기도 합니다.

<br>

## 긴 문서
긴 문서는 보통 여러 조각으로 나누어 저장합니다.
이 조각을 `chunk`라고 부릅니다.

예를 들어 **환불 정책 가이드** 문서는 다음처럼 나눌 수 있습니다.

```text
chunk 0: 환불 가능 조건
chunk 1: 환불 불가 조건
chunk 2: 환불 신청 방법
```

각 chunk는 하나의 vector로 저장되고, document_id나 chunk_index 같은 정보는 metadata에 함께 저장됩니다.
또한 벡터 데이터베이스는 비슷한 벡터를 빠르게 찾기 위해 내부적으로 검색 인덱스를 만듭니다.
대표적인 방식으로는 HNSW가 있습니다.

<br>

# 유사도
위에서 "저장된 벡터들과 비교해 가장 가까운 결과를 반환합니다."라고 언급했습니다.  
여기서 **"가장 가까운"** 이라는 표현이 중요합니다.

<br>

기존 **RDB**는 `id`, `status`, `created_at`처럼 **명확한 조건을 기준으로 정확히 일치하는 데이터를 조회**하는 데 강합니다.  
하지만 **RAG에서는 사용자의 질문과 의미적으로 비슷한 문서나 문장을 찾아야 합니다.**

예를 들어 "로그인이 안 돼요"와 "비밀번호를 잊었어요"는 표현은 다르지만, 같은 인증 문제로 묶일 수 있습니다.  
이런 경우 단순히 같은 단어가 포함되어 있는지를 보는 것만으로는 한계가 있습니다.

<br>

그래서 Vector Database는 문장이나 이미지를 벡터로 변환한 뒤, 벡터 간 거리를 계산해 서로 얼마나 비슷한지 비교합니다.  
즉, Vector Database의 검색은 정확히 같은 값을 찾는 과정이 아니라, **벡터 공간에서 가장 가까운 데이터를 찾는 과정**입니다.

<br>

## 유사도 계산 방식

크게 유사도/거리 계산 방식은 3가지가 존재합니다.
<img src="/vector-db/vector_similarity_kr.png" alt="vector_similarity_kr" align="center" />


### Cosine Similarity
- 벡터의 방향이 얼마나 비슷한지 봅니다.
- 텍스트 임베딩 검색에서 가장 자주 사용됩니다.

### Dot Product
- 두 벡터를 곱해서 유사도를 검색합니다.
- 두 벡터의 방향이 비슷하고 크기도 클수록 Dot Product 값은 커집니다.
- 임베딩 모델에 따라 Dot Product 를 권장하는 경우도 있습니다.

### Euclidean Distance(유클리드 거리)
- 두 벡터 사이의 직선 거리를 계산합니다.
- 거리가 가까울수록 비슷하다고 봅니다.
- 흔히 L2 Distance 라고 부릅니다.

<br>

# 인덱스
앞에서 벡터 데이터베이스는 저장된 벡터들과 사용자의 검색어 벡터를 비교해 가장 가까운 결과를 찾는다고 했습니다.
하지만 저장된 벡터가 수십만 개, 수백만 개라면 모든 벡터와 하나씩 비교하는 방식은 너무 느립니다.
그래서 벡터 데이터베이스는 **빠르게 가까운 벡터를 찾기 위해 인덱스를 사용**합니다.

<br>

## ANN 이란?
먼저 ANN 은 **Approximate Nearest Neighbor** 의 약자로 **모든 벡터를 하나씩 비교하지 않고, 가까울 가능성이 높은 후보를 먼저 찾아 빠르게 검색하는 방식**입니다.

정확한 최근접 벡터를 항상 보장하기보다는, 충분히 가까운 결과를 훨씬 빠르게 찾는 데 초점을 둡니다.

<br>

## HNSW 이란?
HNSW 는 **Hierarchical Navigable Small World** 의 약자로, **ANN 검색을 구현하는 대표적인 그래프 기반 인덱스 알고리즘**입니다.

<br>

벡터들을 그래프의 노드처럼 연결해두고, 검색 시에는 쿼리 벡터와 가장 가까운 노드를 우선적으로 따라가며 후보를 좁혀갑니다.
이때 실제 탐색은 **Priority Queue + Best-First Search** 에 가깝습니다. (Breadth-First Search 아닙니다.)


일반적인 BFS 는 시작점에서 연결 단계가 가까운 노드부터 탐색하지만, [Best-First Search](https://en.wikipedia.org/wiki/Best-first_search) 는 쿼리벡터와 더 가까운 후보를 우선적으로 탐색합니다.

<br>

<img src="/vector-db/hnsw_kr.png" alt="hnsw_kr" align="center" />

d 는 distance 를 의미하며 낮을수록 더 가까운 것을 의미합니다.
참고로 score 로도 표현할 수 있는데 score 는 높을수록 더 유사한 것을 의미합니다.

<br>

그럼 여기서 질문이 생길 수 있습니다.

> 100만 개 데이터가 있으면 100만 개 데이터를 다 탐색해야 하나요?

<br>

아닙니다. HNSW는 모든 벡터를 하나씩 비교하지 않습니다.
크게 두 가지 방식으로 탐색 범위를 줄입니다.

1. **가까운 후보를 우선적으로 탐색합니다.**
  HNSW는 그래프에서 쿼리와 가까운 후보를 먼저 따라갑니다.
  현재 후보보다 더 가까워질 가능성이 낮은 경로는 깊게 탐색하지 않기 때문에, 전체 벡터를 모두 확인하지 않아도 됩니다.

2. **`ef_search`로 탐색 폭을 조절합니다.**  
  `ef_search`는 검색 중 유지할 후보 개수를 의미합니다.
  값이 클수록 더 많은 후보를 확인하므로 정확도는 높아지지만 검색 속도는 느려질 수 있습니다.
  반대로 값이 작으면 더 빠르게 검색할 수 있지만, 가까운 후보를 놓칠 가능성이 커집니다.

<br>

# 검색 결과는 어떻게 반환이 될까?
위에서는 임베딩 모델이 벡터로 변경시켜서 데이터베이스에서 유사도 방식으로 인덱스를 이용해서 검색하는 것을 알아보았습니다.
그럼 자연스럽게 따라나오는 질문들이 있습니다.

> 몇 개의 후보를 가져올까?  
> 가져온 후보가 실제로 관련 없는 데이터라면 어떻게 할까?  
> 가져온 후보의 순서를 다시 조정할 수 있을까?

위 질문을 아래에서 해결해보겠습니다.
<br>

## Top-K
Vector Database 는 보통 가장 가까운 결과 K 개를 반환합니다.
예를 들어 `K = 5` 라면 쿼리와 가장 가까운 벡터 5개를 가져옵니다.

<br>

## Threshold
Top-K로 가져온 데이터는 실제로 관련이 없더라도, 저장된 데이터 중 가장 가까운 결과로 반환될 수 있습니다.
즉, **RAG에서는 관련 없는 문서가 LLM에 전달될 수 있다는 의미**입니다.

이러한 문제를 줄이기 위해 **threshold**를 사용합니다.
`threshold`는 **검색 결과를 사용할 최소 기준값**입니다.

<br>

예를 들어 distance 기준으로 `threshold = 0.3`을 설정했다고 가정해보겠습니다.
distance는 값이 낮을수록 쿼리와 더 가깝다는 의미입니다.

이때 Top-K 결과 중 가장 가까운 문서의 `distance = 0.31`이라면, 기준값인 `0.3`보다 크기 때문에 관련성이 부족하다고 판단할 수 있습니다.
이 경우 **LLM에 문서를 전달하지 않거나, "관련 문서를 찾지 못했다"는 흐름으로 처리**할 수 있습니다.


<br>

## Rerank
**Top-K로 가져온 결과가 항상 최종적으로 가장 적절한 순서라고 보장할 수는 없습니다.**
Vector Search는 빠르게 가까운 후보를 찾는 데 강하지만, 사용자의 질문 의도나 문서의 세부 맥락까지 완벽하게 반영하지 못할 수 있습니다.

이때 **검색된 후보들을 다시 평가해 순서를 조정하는 과정**을 `rerank`라고 합니다.

<br>

예를 들어 Vector Database에서 Top-K로 20개의 후보를 가져온 뒤, Reranker 모델이 각 문서가 질문에 얼마나 적합한지 다시 점수를 매깁니다.
그리고 최종적으로 가장 관련성이 높은 3~5개의 문서만 LLM에 전달할 수 있습니다.

<br>

# 저장 공간(하드디스크)
Vector DB 는 일반적인 텍스트 데이터보다 저장 공간을 많이 사용할 수 있습니다.
이유는 원문뿐만 아니라, 임베딩 모델이 만든 고차원 벡터도 함께 저장하기 때문입니다.

벡터 저장 공간은 대략 다음 공식으로 계산할 수 있습니다.

```text
vector size = dimension x bytes per value
total size = vector count x dimension x bytes per value
```

여기서 dimension 은 벡터를 구성하는 숫자의 개수를 의미합니다.

<br>

계산을 단순화하기 위해 **float32 기준으로 작성**해보겠습니다.
**float32 는 4 byte** 를 사용합니다. 
가장 많이 사용하는 openai 의 text-embedding-3-small 를 기준으로 **1536 개를 기준**으로 작성해보겠습니다.
그럼 하나의 벡터는 아래와 같습니다.

```text
// 1개당
1536 x 4 byte = 6144 byte = 6KB
// 100만 개
6KB x 100만 개 = 6GB
```

위는 벡터에 대한 데이터 크기만 작성한 것이고 metadata, payload, index 도 존재하여 실제 저장 공간은 더 커질 수 있습니다.

<br>

# 메모리
Vector DB 같은 경우에는 **데이터를 디스크에 저장해두고 필요할 때 읽을 수 있고, 검색 속도를 높이기 위해서 메모리에 올려 사용할 수도 있습니다.**
특히 HNSW 같은 그래프 기반 인덱스는 검색 중 여러 노드와 이웃 정보를 빠르게 탐색해야 하므로, 인덱스가 메모리에 올라가 있을수록 검색 성능이 좋아집니다.

<br>

또한 메모리는 단순히 벡터를 저장하는데만 사용되지 않고 **검색 과정에서도 추가 메모리가 필요합니다.**

**100만 개 + 1536 dimension (1536 차원) + float32 (4 byte) + HNSW + metadata 작음** 이라면 필요한 메모리는 아래와 같습니다.

```text
벡터 원본: 6GB
HNSW index: 1~3 GB
metadata / payload / DB overhead: 1~3GB

최소: 8~12GB
여유: 16GB
```

여기서 중요한건 100만 문서가 아니라 100만 벡터 기준으로 작성하였고, 문서가 길다면 chunk 로 나뉘기때문에 벡터수가 더 커질 수 있습니다.

<br>

# 정리
Vector DB는 데이터를 임베딩 모델을 통해 벡터로 변환하고, 벡터 공간에서 가까운 데이터를 찾는 방식으로 검색을 수행합니다.
기존 RDB가 정확히 일치하는 조건 검색에 강하다면, Vector DB는 의미적으로 비슷한 데이터를 찾는 데 강합니다.

<br>

대규모 벡터를 모두 비교하면 비용이 크기 때문에, Vector DB는 ANN 방식을 사용해 가까울 가능성이 높은 후보를 빠르게 좁혀갑니다.
HNSW는 이를 구현하는 대표적인 그래프 기반 인덱스입니다.

<br>

또한 검색 결과를 그대로 사용하는 것이 아니라, Top-K, threshold, rerank 같은 과정을 통해 최종 결과를 조정할 수 있습니다.
운영 환경에서는 dimension, 저장 타입, index, metadata에 따라 저장 공간과 메모리 사용량도 함께 고려해야 합니다.



---language-separator---

# Introduction

After my company decided to add RAG, I naturally started working with Vector DB.
As a developer, I prefer to understand a technology in detail before applying it, so I started studying Vector DB and decided to organize what I learned in this post.

<br>

# What Is a Vector?

A vector is **a way to represent data as an array of numbers**.
When text, images, audio, and other data are embedded, they are converted into high-dimensional vectors.

Example) coffee => [0.12, -0.45, 0.47, ...]

Each number in this array represents one dimension.
**In other words, a vector is like a coordinate used to place data in a high-dimensional space.**

<br>

Data with similar meaning tends to be placed close together in the vector space.

Reference) https://developers.openai.com/api/docs/guides/embeddings

<br>

# Basic Flow of a Vector Database

1. Convert the required data into vectors using an embedding model.
2. Store the vectors and metadata in a vector database such as Qdrant.
3. Convert the user's search query into a vector in the same way.
4. Compare it with the stored vectors and return the closest results.

<br>

To understand this flow, we first need to understand **embedding**.  
Embedding is the process of converting data such as text, images, or audio into **vectors**, which are numeric arrays that contain meaning.  
The vector created through this process is called an **embedding vector**, and the model that performs this conversion is called an **embedding model**.

Let's look at embedding in a little more detail.

<br>

# How Does an Embedding Model Create Vectors?

An embedding model does not convert a sentence directly into a vector in one step.
Internally, it goes through several steps to create a numeric array.

1. **Split the sentence into tokens.**
   - This process is called tokenization, and the tool that performs it is called a tokenizer.
   - A token can be a word, or it can be a smaller piece of a word.

2. **Convert each token into a numeric ID.**
   - The tokenizer looks up each token in its tokenizer vocabulary and converts it into a corresponding numeric ID.
   - For example, the sentence "I went to the bank" could be converted into an array of token IDs such as `[3512, 48, 9021]`.

3. **Convert the numeric IDs into vectors.**
   - Each token ID is converted into a numeric array through an embedding table.
   - For example, the ID `3512` could be converted into a vector like `[0.12, -0.31, 0.78, ...]`.

4. **Create the final vector with context.**
   - The same word "bank" can mean a financial institution or the side of a river depending on context.
   - The embedding model calculates relationships between tokens in the sentence and creates a vector that reflects the context.

<br>

As a result, the embedding model converts a sentence or document into a numeric array that contains meaning.

Structures such as Transformer Attention may be used in this process, but this post only covers the level needed to understand how Vector Database search works.

<br>

# What Is Stored in a Vector Database?

A vector database usually stores the following information.

1. **id**
   - A unique value used to identify each data item.

2. **vector**
   - A numeric array created by passing the original text into an embedding model.
   - These vectors are compared to find semantically similar data.

3. **metadata**
   - Additional information about the vector.
   - Examples include `document_id`, `title`, `source`, and `chunk_index`.

4. **payload**
   - The original text or data to show again in the search result.
   - In some cases, the database stores only a reference to where the original data exists instead of storing the original text directly.

<br>

## Long Documents

Long documents are usually split into multiple pieces before being stored.
Each piece is called a `chunk`.

For example, a **refund policy guide** can be split like this.

```text
chunk 0: Refund eligibility
chunk 1: Non-refundable cases
chunk 2: How to request a refund
```

Each chunk is stored as one vector, and information such as `document_id` and `chunk_index` is stored together in metadata.
Vector databases also create internal search indexes to find similar vectors quickly.
A representative example is HNSW.

<br>

# Similarity

Earlier, I mentioned that the database compares the query vector with stored vectors and returns the closest results.  
The phrase **"closest results"** is important here.

<br>

Traditional **RDBs** are good at retrieving data that exactly matches clear conditions such as `id`, `status`, or `created_at`.  
However, in **RAG, we need to find documents or sentences that are semantically similar to the user's question.**

For example, "I can't log in" and "I forgot my password" are different expressions, but they can both be related to an authentication problem.  
In this case, simply checking whether the same words are included has limitations.

<br>

So a Vector Database converts sentences or images into vectors and compares how similar they are by calculating distances between vectors.  
In other words, Vector Database search is not about finding exactly the same value. It is about **finding the closest data in vector space**.

<br>

## Similarity Calculation Methods

There are three common similarity or distance calculation methods.

<img src="/vector-db/vector_similarity_en.png" alt="vector_similarity_en" align="center" />

### Cosine Similarity

- Measures how similar the directions of two vectors are.
- Commonly used in text embedding search.

### Dot Product

- Calculates similarity by multiplying two vectors.
- The Dot Product becomes larger when two vectors point in similar directions and have larger magnitudes.
- Some embedding models recommend using Dot Product.

### Euclidean Distance

- Calculates the straight-line distance between two vectors.
- The smaller the distance, the more similar the vectors are.
- It is also commonly called L2 Distance.

<br>

# Index

As mentioned earlier, a Vector Database compares the user's query vector with stored vectors to find the closest results.
However, if there are hundreds of thousands or millions of vectors, comparing every vector one by one is too slow.
That is why Vector Databases use **indexes to quickly find nearby vectors**.

<br>

## What Is ANN?

ANN stands for **Approximate Nearest Neighbor**. It is **a search method that does not compare every vector one by one, but quickly finds candidates that are likely to be close**.

Instead of always guaranteeing the exact nearest vector, ANN focuses on finding results that are close enough much faster.

<br>

## What Is HNSW?

HNSW stands for **Hierarchical Navigable Small World**.
It is a representative graph-based index algorithm used to implement ANN search.

<br>

Vectors are connected like nodes in a graph.
During search, HNSW narrows down candidates by following nodes that are closer to the query vector.
The actual traversal is close to **Priority Queue + Best-First Search**. It is not Breadth-First Search.

In a typical BFS, nodes are explored based on how many connection steps away they are from the starting point.
In [Best-First Search](https://en.wikipedia.org/wiki/Best-first_search), candidates closer to the query vector are explored first.

<br>

<img src="/vector-db/hnsw_en.png" alt="hnsw_en" align="center" />

Here, `d` means distance. The lower the value, the closer it is to the query vector.
It can also be expressed as a score. In that case, a higher score usually means higher similarity.

<br>

At this point, a natural question can come up.

> If there are 1 million data points, does HNSW have to search all 1 million?

<br>

No. HNSW does not compare every vector one by one.
It reduces the search range mainly in two ways.

1. **It searches closer candidates first.**
   HNSW follows candidates that are closer to the query in the graph.
   If a path is unlikely to produce a closer candidate than the current one, it does not need to deeply explore that path.
   Because of this, it does not have to check every vector.

2. **It controls the search width with `ef_search`.**  
   `ef_search` means the number of candidates maintained during search.
   A larger value checks more candidates, which can improve accuracy but may slow down search.
   A smaller value can make search faster, but it increases the chance of missing closer candidates.

<br>

# How Are Search Results Returned?

So far, we have looked at how an embedding model converts data into vectors and how a database searches using similarity calculation and indexes.
This naturally leads to a few questions.

> How many candidates should be returned?  
> What if the returned candidates are not actually relevant?  
> Can we adjust the order of the returned candidates again?

Let's answer these questions below.

<br>

## Top-K

A Vector Database usually returns the closest K results.
For example, if `K = 5`, it returns the five vectors closest to the query.

<br>

## Threshold

Even if the data returned by Top-K is not actually relevant, it can still be returned as the closest result among the stored data.
This means that in **RAG, irrelevant documents may be passed to the LLM**.

To reduce this problem, we use a **threshold**.
A `threshold` is **the minimum criterion for using a search result**.

<br>

For example, assume that we set `threshold = 0.3` based on distance.
Distance means that the lower the value, the closer it is to the query.

If the closest document in the Top-K results has `distance = 0.31`, it is larger than the threshold `0.3`, so we can treat it as not relevant enough.
In this case, we can **avoid passing the document to the LLM or handle it as "no relevant document found."**

<br>

## Rerank

**The results returned by Top-K are not always guaranteed to be in the best final order.**
Vector Search is good at quickly finding close candidates, but it may not perfectly reflect the user's intent or the detailed context of each document.

The process of evaluating the retrieved candidates again and adjusting their order is called `rerank`.

<br>

For example, a Vector Database can first retrieve 20 candidates with Top-K.
Then a reranker model can score how relevant each document is to the question.
Finally, only the top 3 to 5 most relevant documents can be passed to the LLM.

<br>

# Storage Space

Vector DB can use more storage space than ordinary text data.
This is because it stores not only the original text, but also the high-dimensional vectors created by the embedding model.

Vector storage size can be roughly calculated with the following formula.

```text
vector size = dimension x bytes per value
total size = vector count x dimension x bytes per value
```

Here, `dimension` means the number of numeric values that make up a vector.

<br>

To keep the calculation simple, let's use **float32** as the baseline.
**float32 uses 4 bytes** per value.
Using OpenAI's commonly used `text-embedding-3-small` model as an example, the default vector dimension is **1536**.
So one vector is calculated as follows.

```text
// per vector
1536 x 4 byte = 6144 byte = 6KB

// 1 million vectors
6KB x 1,000,000 = 6GB
```

This only covers the size of the vector data itself.
In reality, metadata, payload, and indexes also exist, so the actual storage usage can be larger.

<br>

# Memory

A Vector DB can **store data on disk and read it when needed, or load data into memory to improve search speed**.
In particular, graph-based indexes such as HNSW need to quickly traverse many nodes and neighbor links during search, so search performance improves when the index is in memory.

<br>

Memory is not only used to store vectors.
**Additional memory is also needed during the search process.**

For example, if we have **1 million vectors + 1536 dimensions + float32 (4 bytes) + HNSW + small metadata**, the required memory can be estimated as follows.

```text
Raw vectors: 6GB
HNSW index: 1~3GB
metadata / payload / DB overhead: 1~3GB

Minimum: 8~12GB
Recommended headroom: 16GB
```

The important point is that this is based on 1 million vectors, not 1 million documents.
If documents are long and split into chunks, the number of vectors can become much larger.

<br>

# Summary

Vector DB converts data into vectors through an embedding model and searches by finding nearby data in vector space.
If traditional RDBs are strong at exact-match condition queries, Vector DBs are strong at finding semantically similar data.

<br>

Comparing all vectors at scale is expensive, so Vector DBs use ANN to quickly narrow down candidates that are likely to be close.
HNSW is a representative graph-based index that implements this approach.

<br>

Search results are also not used as-is.
Top-K, threshold, and rerank can be used together to adjust the final results.
In production, storage and memory usage should also be considered based on dimension, storage type, index, and metadata.
