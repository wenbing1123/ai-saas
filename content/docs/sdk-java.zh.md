---
title: Java（零依赖）
category: SDK
sort: 80
---

# Java 指南

在 Java 中调用 Nebula API 并不需要第三方 HTTP 库。下面的示例只使用 **JDK 11 或更高版本**内置的 `java.net.http.HttpClient`——无需任何 Maven 或 Gradle 依赖。在生产应用中，你当然可以使用任意 JSON 库或生成的 OpenAPI 客户端；通信协议就是标准的 HTTPS JSON。

## OpenAI 协议：完整示例

下面的程序构建一个 chat completion 请求，携带 bearer token 发送到 `{{base_url}}/v1/chat/completions`，并打印原始 JSON 响应。保存为 `NebulaOpenAiDemo.java`。

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class NebulaOpenAiDemo {

    private static final String BASE_URL = "{{base_url}}";
    private static final String API_KEY =
            System.getenv().getOrDefault("NEBULA_API_KEY", "sk-nebula-...");

    public static void main(String[] args) throws Exception {
        String endpoint = BASE_URL + "/v1/chat/completions";

        String userPrompt = "Give me one practical tip for visiting Jakarta.";

        // 构建 JSON 请求体。生产环境建议使用 Jackson 等库；
        // 下面的 jsonString() 让本示例保持零依赖。
        String body = "{"
                + "\"model\": \"deepseek-chat\","
                + "\"messages\": ["
                + "  {\"role\": \"system\", \"content\": \"You are a concise assistant.\"},"
                + "  {\"role\": \"user\", \"content\": " + jsonString(userPrompt) + "}"
                + "],"
                + "\"temperature\": 0.7"
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + API_KEY)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = client.send(
                request, HttpResponse.BodyHandlers.ofString());

        System.out.println("HTTP " + response.statusCode());
        System.out.println(response.body());
    }

    /** 将字符串转义并包裹为 JSON 字符串字面量。 */
    private static String jsonString(String value) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    sb.append(c);
            }
        }
        return sb.append('"').toString();
    }
}
```

编译并运行：

```bash
javac NebulaOpenAiDemo.java
export NEBULA_API_KEY="sk-nebula-..."
java NebulaOpenAiDemo
```

Windows PowerShell 下，先执行 `$env:NEBULA_API_KEY = "sk-nebula-..."`，再运行 `java NebulaOpenAiDemo`。

成功时会打印 `HTTP 200` 以及 completion JSON；助手文本位于 `choices[0].message.content`。

### 列出模型

要验证 key 或列出可用模型，向 `/v1/models` 发送一个简单的 `GET` 请求：

```java
HttpRequest listRequest = HttpRequest.newBuilder()
        .uri(URI.create(BASE_URL + "/v1/models"))
        .timeout(Duration.ofSeconds(30))
        .header("Authorization", "Bearer " + API_KEY)
        .GET()
        .build();

HttpResponse<String> listResponse = HttpClient.newHttpClient()
        .send(listRequest, HttpResponse.BodyHandlers.ofString());

System.out.println("HTTP " + listResponse.statusCode());
System.out.println(listResponse.body());
```

## Anthropic 协议：关键差异

与 OpenAI 示例相比，Anthropic 网关有三处变化：

1. URL 为 `{{base_url}}/anthropic/v1/messages`。
2. 鉴权使用 `x-api-key` 请求头，而不是 `Authorization: Bearer`，并且必须携带 `anthropic-version: 2023-06-01` 请求头。
3. 请求体使用 messages 结构，且必须包含 `max_tokens`。

```java
String endpoint = BASE_URL + "/anthropic/v1/messages";

String body = "{"
        + "\"model\": \"claude-sonnet-4-20250514\","
        + "\"max_tokens\": 1024,"
        + "\"system\": \"You are a concise assistant.\","
        + "\"messages\": ["
        + "  {\"role\": \"user\", \"content\": " + jsonString(userPrompt) + "}"
        + "]"
        + "}";

HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(endpoint))
        .timeout(Duration.ofSeconds(60))
        .header("x-api-key", API_KEY)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();

HttpResponse<String> response = HttpClient.newHttpClient()
        .send(request, HttpResponse.BodyHandlers.ofString());

System.out.println("HTTP " + response.statusCode());
System.out.println(response.body());
```

响应结构也不同：回答位于 `content` 数组中 `{"type": "text", "text": "..."}` 形式的内容块里，用量则以 `input_tokens` 和 `output_tokens` 表示。

## 安全读取 key

请优先使用环境变量或框架的密钥配置，不要硬编码字面量：

```java
String apiKey = System.getenv("NEBULA_API_KEY");
if (apiKey == null || apiKey.isBlank()) {
    throw new IllegalStateException("Set the NEBULA_API_KEY environment variable.");
}
```

## 流式调用与超时

当请求体包含 `"stream": true` 时，两个网关都会以 server-sent events 形式流式返回。使用内置客户端时，可以通过 `BodyHandlers.ofInputStream()`（或 `ofLines()`）增量消费响应，逐行解析到达的每个 `data:` 行；同时请设置宽松的请求超时，因为较长的生成本身就需要时间。

## 错误处理

解析响应体之前先检查 `response.statusCode()`：

- `401`——key 无效或已吊销；检查 `NEBULA_API_KEY`。
- `402`——余额不足；充值后重试，本次不会扣费。
- `404`——所选协议下不存在该 model id；通过 `GET /v1/models` 核对。
- `429`——触发限流；使用指数退避重试，并遵守可能存在的 `Retry-After` 头。
- `503`——上游暂时不可用；稍等后重试。

健壮的客户端应仅对可安全重试的失败（`429`、`503`、网络层 `IOException`）使用有上限的指数退避重试。详见 [错误处理](/docs/errors) 页面。
