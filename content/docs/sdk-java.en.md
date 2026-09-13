---
title: Java (no dependencies)
category: SDKs
sort: 80
---

# Java Guide

You do not need a third-party HTTP library to call Nebula API from Java. The examples below use only the built-in `java.net.http.HttpClient` from **JDK 11 or newer** — no Maven or Gradle dependencies required. For production applications you can of course use any JSON library or generated OpenAPI client; the wire protocol is standard HTTPS JSON.

## OpenAI protocol: complete example

This program builds a chat-completion request, sends it to `{{base_url}}/v1/chat/completions` with the bearer token, and prints the raw JSON response. Save it as `NebulaOpenAiDemo.java`.

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

        // Build the JSON body. In production prefer a library such as Jackson;
        // jsonString() below keeps this example dependency-free.
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

    /** Quotes and escapes a string as a JSON string literal. */
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

Compile and run:

```bash
javac NebulaOpenAiDemo.java
export NEBULA_API_KEY="sk-nebula-..."
java NebulaOpenAiDemo
```

On Windows PowerShell, set the key with `$env:NEBULA_API_KEY = "sk-nebula-..."` before running `java NebulaOpenAiDemo`.

A successful run prints `HTTP 200` followed by the completion JSON; the assistant text is located at `choices[0].message.content`.

### Listing models

To verify your key or list available models, send a simple `GET` to `/v1/models`:

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

## Anthropic protocol: key differences

The Anthropic gateway needs three changes compared with the OpenAI example:

1. The URL is `{{base_url}}/anthropic/v1/messages`.
2. Authentication uses the `x-api-key` header instead of `Authorization: Bearer`, plus the mandatory `anthropic-version: 2023-06-01` header.
3. The body uses the messages shape and requires `max_tokens`.

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

The response shape also differs: the answer is inside the `content` array in blocks of `{"type": "text", "text": "..."}`, and usage is reported as `input_tokens` and `output_tokens`.

## Reading the key safely

Prefer environment variables or your framework's secret configuration over hard-coded literals:

```java
String apiKey = System.getenv("NEBULA_API_KEY");
if (apiKey == null || apiKey.isBlank()) {
    throw new IllegalStateException("Set the NEBULA_API_KEY environment variable.");
}
```

## Streaming and timeouts

Both gateways stream with server-sent events when the body contains `"stream": true`. With the built-in client, consume the response incrementally with `BodyHandlers.ofInputStream()` (or `ofLines()`) and parse each `data:` line as it arrives; set a generous request timeout because long generations legitimately take time.

## Error handling

Check `response.statusCode()` before parsing the body:

- `401` — invalid or revoked key; verify `NEBULA_API_KEY`.
- `402` — insufficient balance; top up and retry, nothing was charged.
- `404` — the model id does not exist on the selected protocol; check `GET /v1/models`.
- `429` — rate limited; retry with exponential backoff, honoring any `Retry-After` header.
- `503` — upstream temporarily unavailable; retry after a short wait.

For robust clients, retry only idempotent-looking failures (`429`, `503`, network `IOException`) with capped exponential backoff. See the [Errors](/docs/errors) page for details.
