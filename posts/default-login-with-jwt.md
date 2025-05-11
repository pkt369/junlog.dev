---
title:
  ko: "기본 로그인 구현 with Jwt token"
  en: "Implement Default Login with Jwt token"
excerpt:
  ko: "어떻게 로그인을 구현하고 Jwt 로 통신하는지에 대해 알아보겠습니다."
  en: "Let's learn how to implement login logic using JWT."
date: "2025-04-28"
category:
  ko: "Backend"
  en: "Backend"
tags: ["Jwt", "login", "spring boot", "react", "typescript", "java"]
slug: "default-login-with-jwt"
---

로그인은 유저를 인증하는 절차로 웹이나 앱을 구현한다면 대부분의 서비스는 구현을 해야합니다.
<br>

## 시스템 구조
시스템 구조는 다음과 같습니다. 

<div align="center">
  <img src="/login-with-jwt/login-system-structure.png" alt="login-system-structure" />
</div>

화면에서 요청하면 Oauth2, 기본 로그인 **모두 서버로 보내고**, 서버에서 분기처리하는 방식으로 진행이 됩니다.
특히 Oauth2 의 경우에는 백엔드에서는 유저에게 따로 **새로운 페이지로 리다이렉션**시켜 소셜네트워크 로그인을 진행하게 됩니다.
<br/>

여기서 로그인이 성공하면 유저를 인증할 수 있는 방식을 유저에게 **쿠키**에 담아서 전달하게 됩니다.<br/>
- **세션 방식**
- **토큰 방식**

위의 두가지가 존재합니다.
이번 포스팅의 경우는 **Jwt** 을 기준으로 작성된 포스팅입니다.
>> Jwt 은 Json Web Token 의 줄임말로 세션에 저장하지 않고, 토큰만으로 인증하여 빠르고 가볍다는 장점이 있습니다.

<br>
<br>

## 구현

지금 구현되는 코드들은 **기본 로그인**을 기준으로 작성되어져 있습니다.
기술 스택은 **Typescript + react + Springboot + Java** 입니다.

<br>

로그인을 구현할때 다음과 같은 코드를 Frontend 에서 서버로 보내게 됩니다.

```typescript
const login: SubmitHandler<LoginInput> = async (data) => {
    try {
        await axios.post(`${config.backend}/auth/login`, {
            email: data.email,
            password: data.password
        }, {
            withCredentials: true
        });
        await fetchUser();
        navigate('/');
    } catch (e) {
        if (axios.isAxiosError(e)) {
            if (e.response?.data.status === 'not_verify') {
                setModalTitle('이메일 인증 필요');
                setModalMessage('보안을 위해 이메일 인증이 필요합니다. 가입하신 이메일 주소로 인증 메일을 발송하였으니, 메일함을 확인하시고 안내에 따라 인증을 완료해 주세요. 이메일을 인증하신 후 다시 로그인하시면 정상적으로 이용하실 수 있습니다.');
                setIsModalOpen(true);
                return;
            }
            if (e.response?.status === 400) {
                setModalTitle('로그인 실패');
                setModalMessage('로그인에 실패하였습니다. 이메일과 패스워드를 확인해주세요.');
                setIsModalOpen(true);
                return;
            }
        }
        console.log(e);
        alert("예상하지 못한 에러가 발생하였습니다.");
    }
};
```



그럼 백엔드 코드에서는 로그인 정보를 받아서 해당 유저가 존재하는지 확인하게 됩니다.

```java
// controller
@PostMapping("/login")
public ResponseEntity<String> login(@Valid @RequestBody LoginRequestDto loginRequestDto) {
    User user = userService.login(loginRequestDto);
    ResponseCookie jwtCookie = jwtTokenProvider.getJwtCookie(user);
    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
            .body("login success");
}
//LoginRequestDto <= login info

// Service
public User login(LoginRequestDto loginRequestDto) {
    Optional<User> userOptional = userRepository.findByEmail(loginRequestDto.getEmail());
    User user = userOptional.orElseThrow(NoExistUserException::new);

    if (!new BCryptPasswordEncoder().matches(loginRequestDto.getPassword(), user.getPassword())) {
        throw new NoExistUserException();
    }
    if (!user.isVerified()) {
        throw new NotVerifyUserException();
    }

    return user;
}
```

다음 코드는 JWT 를 관리하는 코드입니다.

```java
//JwtProvider
public ResponseCookie getJwtCookie(User user) {
    String token = createToken(user);
    return cookieFactory(token, EXPIRATION_HOURS * 60 * 60 * 1000);
}

public String createToken(User user) {
    return Jwts.builder()
            .subject(user.getEmail())
            .claim("name", user.getName())
            .claim("role", user.getRole())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + (EXPIRATION_HOURS * 60 * 60 * 1000)))
            .signWith(key)
            .compact();
}

public ResponseCookie cookieFactory(String token, int maxAge) {
    if (activeProfile.equals("local")) {
        return ResponseCookie.from("Authorization", token)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }

    return ResponseCookie.from("Authorization", token)
            .httpOnly(true)
            .secure(true)
            .path("/")
            .maxAge(maxAge)
            .sameSite("None")
            .build();
}
```

코드를 보시면 로그인 정보를 가져와 Service 에서 valid 한 다음 유저를 반환하고, 유저의 값으로 토큰을 만들어 반환하는 구조를 가지고 있습니다.

토큰을 쿠키에 담아서 Frontend 으로 보내게 되면 화면에서는 `{withCredentials: true}` 만 보내면 쿠키를 서버로 보내게 됨으로 유저를 서버에서 인증할 수 있게 되는 구조입니다.

전체 코드는 아래의 **Git Repository** 에 적어두었습니다.

**Frontend**: https://github.com/pkt369/login-nextjs
**Backend**: https://github.com/pkt369/login-springboot

<br>
<br>

## 마무리

로그인은 생각보다 간단하지만 문제에 부딪힌다면 시간이 많이 뺏어가지만 한번 이해하면 쉽다고 생각합니다.
마지막으로 로그인할때 신경써야 할 점은 다음과 같습니다.
<br>

### 1. 토큰 만료 관리

토큰이 만료되면 Refresh Token 을 구현하거나 새롭게 로그인을 하도록 유도하는 방식으로 나뉘어집니다.
여기서 구현한 경우는 새롭게 로그인을 유도하는 방식입니다.

<br>

### 2. 토큰 시간

토큰의 시간은 ` return cookieFactory(token, EXPIRATION_HOURS * 60 * 60 * 1000);` 코드가 이렇게 구현되어 있습니다.
토큰 생성 시 입력해야 하는 시간 인자는 ms 로 이루어져 있어 **1 초가 1000ms** 입니다.
따라서 1 시간을 원할 경우 위와 같이 작성되어야 합니다.

<br>

### 3. CORS (Cross-Origin Resource Sharing)

URL 이 다를 경우 쿠키를 주고 받을때 CORS 설정을 따로 해두지 않으면 CORS 에러가 발생합니다.
**브라우저의 보안 정책(Same-Origin Policy)** 때문에 기본적으로 막혀있어서 서버에서 따로 설정해두어야 합니다.

```java
public ResponseCookie cookieFactory(String token, int maxAge) {
    if (activeProfile.equals("local")) {
        return ResponseCookie.from("Authorization", token)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }

    return ResponseCookie.from("Authorization", token)
            .httpOnly(true)
            .secure(true)
            .path("/")
            .maxAge(maxAge)
            .sameSite("None")
            .build();
}
```

local 의 경우 https 로 통신하기 힘들기때문에 **secure 를 false 를 두고 SameSite 를 Lax** 로 두어 사용합니다.
반대로 Local 이 아닌 네트워크를 타는 경우 **Https 를 사용하고 SameSite: None** 으로 진행하게 됩니다.
<br>

### 보안
JWT 의 경우 탈취를 당하는 경우 서버는 서명된 토큰이기에 믿을 수 밖에 없습니다. 
따라서 우리는 따로 요청한 IP 를 기록해서, 같은 IP 에서 오는지 확인하는 작업을 하면 해킹을 막을 수 있습니다.
추가로 **JWT 만료 시간을 짧게 하고 refresh 토큰을 발급하는 방식이 안전**합니다.



---language-separator---

Whenever we build a web or mobile application, implementing a login system for user authentication is usually necessary.
<br>

## System Structure
System Strcture is same as below

<img src="/login-with-jwt/login-system-structure.png" alt="login-system-structure" align="center"/>

When a user initiates a login from the frontend, both OAuth2 and default login **requests are forwarded to the server**.
The server then separates the logic depending on the type of request.
In the case of OAuth2, **the server redirects the user to the appropriate social login page to handle authentication.**

<br/>

Upon successful login, the server issues authentication to the user via a **cookie**.
Normally, we use two types as shown below:
- **Session**
- **Token**

In this post, we focus on **JWT** as the method of authentication.
>> JWT (JSON Web Token) is a lightweight authentication method where **the server doesn’t store session data** but instead uses a token to verify users, making it faster than session-based authentication.

<br>

## Implementation

The following code examples are based on default login.
Our tech stack includes **TypeScript, React, Spring Boot, and Java**.

<br>

When implementing a login system, the following code sends the data from the frontend to the server.

```typescript
const login: SubmitHandler<LoginInput> = async (data) => {
    try {
        await axios.post(`${process.env.API_URL}/auth/login`, {
            email: data.email,
            password: data.password
        }, {
            withCredentials: true
        });
        await fetchUser();
        router.push('/');
    } catch (e) {
        if (axios.isAxiosError(e)) {
            if (e.response?.data.status === 'not_verify') {
                setModalTitle('Email verification required');
                setModalMessage('For security reasons, email verification is required. A verification email has been sent to your registered email address, so please check your inbox and follow the instructions to complete the verification. After verifying your email, you will be able to log in normally.');
                setIsModalOpen(true);
                return;
            }
            if (e.response?.status === 400) {
                setModalTitle('Login failed');
                setModalMessage('Login failed. Please check your email and password.');
                setIsModalOpen(true);
                return;
            }
        }
        console.log(e);
        alert("An unexpected error occurred.");
    }
};
```

The server then verifies the user by receiving the login information.

```java
// controller
@PostMapping("/login")
public ResponseEntity<String> login(@Valid @RequestBody LoginRequestDto loginRequestDto) {
    User user = userService.login(loginRequestDto);
    ResponseCookie jwtCookie = jwtTokenProvider.getJwtCookie(user);
    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
            .body("login success");
}
//LoginRequestDto <= login info

// Service
public User login(LoginRequestDto loginRequestDto) {
    Optional<User> userOptional = userRepository.findByEmail(loginRequestDto.getEmail());
    User user = userOptional.orElseThrow(NoExistUserException::new);

    if (!new BCryptPasswordEncoder().matches(loginRequestDto.getPassword(), user.getPassword())) {
        throw new NoExistUserException();
    }
    if (!user.isVerified()) {
        throw new NotVerifyUserException();
    }

    return user;
}
```

The following codes manage JWT.

```java
//JwtProvider
public ResponseCookie getJwtCookie(User user) {
    String token = createToken(user);
    return cookieFactory(token, EXPIRATION_HOURS * 60 * 60 * 1000);
}

public String createToken(User user) {
    return Jwts.builder()
            .subject(user.getEmail())
            .claim("name", user.getName())
            .claim("role", user.getRole())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + (EXPIRATION_HOURS * 60 * 60 * 1000)))
            .signWith(key)
            .compact();
}

public ResponseCookie cookieFactory(String token, int maxAge) {
    if (activeProfile.equals("local")) {
        return ResponseCookie.from("Authorization", token)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }

    return ResponseCookie.from("Authorization", token)
            .httpOnly(true)
            .secure(true)
            .path("/")
            .maxAge(maxAge)
            .sameSite("None")
            .build();
}
```
In this code, the JWT manager validates the login information in the service, and then generates and returns an authentication token based on the user’s data.

Once the token is stored in the cookie and sent to the frontend, the frontend can send it back to the server with `{withCredentials: true}`, enabling the server to authenticate the user using the token.

All the code has been written and shared in the **Git repository**.

**Frontend**: https://github.com/pkt369/login-nextjs
**Backend**: https://github.com/pkt369/login-springboot

<br>
<br>

## Result

Login is easier to implement than it seems, but if we run into issues, it can take up a lot of time. However, once you understand it, it becomes straightforward.
Finally, here are the key points to keep in mind when implementing login.
<br>

### 1. Manage token expiration time

If the token is expired, we should provide a refresh token or redirect the user to the login page with an alert about the expiration.
In this case, I have implemented the approach where the user is redirected to the login page to log in again.

<br>

### 2. Manage token time with cookie.

We can control the **token’s expiration time** using the following code:
`expiration(new Date(System.currentTimeMillis() + (EXPIRATION_HOURS * 60 * 60 * 1000)))`
Then we can check the expiration time with this logic.

We should also set the **cookie’s expiration time**, such as:
`return cookieFactory(token, EXPIRATION_HOURS * 60 * 60 * 1000);`

When setting time for the token or cookie, the time is based on **milliseconds (ms)**.
This means 1 second equals 1000 milliseconds.
So, if we want to set the expiration time to 1 hour, we should write 1 * 60 * 60 * 1000.

<br>

### 3. CORS (Cross-Origin Resource Sharing)

If the URLs don’t match between the frontend and backend, we may encounter a CORS error.
This happens because of the **browser’s security policy (Same-Origin Policy)**, which blocks requests by default. Therefore, the server needs to set the appropriate CORS configuration to allow these requests.

```java
public ResponseCookie cookieFactory(String token, int maxAge) {
    if (activeProfile.equals("local")) {
        return ResponseCookie.from("Authorization", token)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }

    return ResponseCookie.from("Authorization", token)
            .httpOnly(true)
            .secure(true)
            .path("/")
            .maxAge(maxAge)
            .sameSite("None")
            .build();
}
```
In local environments, it’s difficult to communicate using HTTPS, **so we set Secure to false and SameSite to Lax.**

In other cases, we should **use HTTPS and set SameSite to None.**
<br>

### Authentication
When JWT is stolen, the server has to trust the JWT token sent, since it’s signed.
To make it stronger, you can **include the IP address in the token**, and then check the IP from the request against the IP in the token.
Additionally, **setting a short JWT expiration time and providing a refresh token can enhance security.**