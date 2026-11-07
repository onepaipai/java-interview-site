package dev.interview.knowledge;

import static org.springframework.http.HttpStatus.*;

import com.fasterxml.jackson.databind.*;
import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ModelClient {

  private final ObjectMapper json;
  final String base, key, model, embeddingModel;
  private final boolean enabled;

  @Value("${app.ai.chat-timeout-ms:90000}")
  long chatTimeoutMs = 90000;

  @Value("${app.ai.embedding-timeout-ms:20000}")
  long embeddingTimeoutMs = 20000;

  @Value("${app.ai.max-output-tokens:2048}")
  int maxOutputTokens = 2048;

  @Value("${app.ai.max-input-characters:80000}")
  int maxInputCharacters = 80000;

  @jakarta.annotation.PostConstruct
  void validateLimits() {
    if (
      chatTimeoutMs < 1 || embeddingTimeoutMs < 1 || maxOutputTokens < 1 || maxInputCharacters < 1
    ) throw new IllegalArgumentException("AI 超时及输入输出预算必须为正数");
  }

  static final int MAX_RESPONSE_BYTES = 2_000_000;
  private final HttpClient http = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .followRedirects(HttpClient.Redirect.NEVER)
    .build();

  public ModelClient(
    ObjectMapper json,
    @Value("${AI_BASE_URL:}") String base,
    @Value("${AI_API_KEY:}") String key,
    @Value("${AI_MODEL:}") String model,
    @Value("${AI_EMBEDDING_MODEL:}") String embeddingModel,
    @Value("${AI_ENABLED:false}") boolean enabled
  ) {
    this.json = json;
    this.base = base.replaceAll("/+$", "");
    this.key = key;
    this.model = model;
    this.embeddingModel = embeddingModel;
    this.enabled = enabled;
  }

  boolean ready() {
    return enabled && !base.isBlank() && !model.isBlank();
  }

  String embeddingIdentity() {
    return base + "|" + embeddingModel;
  }

  private JsonNode call(String path, Object payload) {
    if (!ready()) throw new ResponseStatusException(
      SERVICE_UNAVAILABLE,
      "管理员尚未启用模型，请配置 AI_ENABLED、AI_BASE_URL 和 AI_MODEL"
    );
    try {
      URI uri = URI.create(base + path);
      if (
        !List.of("http", "https").contains(uri.getScheme()) ||
        uri.getHost() == null ||
        uri.getUserInfo() != null
      ) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "模型接口地址配置无效");
      long timeout = path.equals("/embeddings") ? embeddingTimeoutMs : chatTimeoutMs;
      var builder = HttpRequest.newBuilder(uri)
        .timeout(Duration.ofMillis(timeout))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)));
      if (!key.isBlank()) builder.header("Authorization", "Bearer " + key);
      var body = new BoundedBody();
      var exchange = http.sendAsync(builder.build(), info -> body);
      HttpResponse<byte[]> response;
      try {
        response = exchange.get(timeout, TimeUnit.MILLISECONDS);
      } catch (TimeoutException e) {
        body.cancel(e);
        exchange.cancel(true);
        throw new ResponseStatusException(GATEWAY_TIMEOUT, "模型请求超时，请稍后重试");
      } catch (InterruptedException e) {
        body.cancel(e);
        exchange.cancel(true);
        throw e;
      }
      {
        if (response.statusCode() != 200) throw new ResponseStatusException(
          BAD_GATEWAY,
          switch (response.statusCode()) {
            case 401, 403 -> "模型认证失败，请检查服务器密钥";
            case 429 -> "模型服务限流，请稍后重试";
            default -> "模型服务请求失败，请检查服务器配置";
          }
        );
        byte[] bytes = response.body();
        var result = json.readTree(bytes);
        if (result == null || !result.isObject()) throw new ResponseStatusException(
          BAD_GATEWAY,
          "模型响应必须是 JSON 对象"
        );
        return result;
      }
    } catch (ResponseStatusException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ResponseStatusException(SERVICE_UNAVAILABLE, "模型请求已中断");
    } catch (Exception e) {
      for (Throwable cause = e; cause != null; cause = cause.getCause()) if (
        cause instanceof ResponseTooLarge
      ) throw new ResponseStatusException(BAD_GATEWAY, "模型返回内容过大");
      throw new ResponseStatusException(BAD_GATEWAY, "模型连接失败或响应无效，请检查接口后重试");
    }
  }

  /** Cancel before the buffering subscriber can accumulate an oversized provider response. */
  static final class BoundedBody implements HttpResponse.BodySubscriber<byte[]> {

    private final HttpResponse.BodySubscriber<byte[]> delegate =
      HttpResponse.BodySubscribers.ofByteArray();
    private Flow.Subscription subscription;
    private long received;
    private boolean failed;

    public CompletionStage<byte[]> getBody() {
      return delegate.getBody();
    }

    public synchronized void onSubscribe(Flow.Subscription value) {
      subscription = value;
      delegate.onSubscribe(value);
      if (failed) value.cancel();
    }

    public synchronized void onNext(List<ByteBuffer> buffers) {
      if (failed) return;
      long size = buffers.stream().mapToLong(ByteBuffer::remaining).sum();
      if (size > MAX_RESPONSE_BYTES - received) {
        failed = true;
        subscription.cancel();
        delegate.onError(new ResponseTooLarge());
        return;
      }
      received += size;
      delegate.onNext(buffers);
    }

    public synchronized void onError(Throwable error) {
      if (!failed) {
        failed = true;
        delegate.onError(error);
      }
    }

    public synchronized void onComplete() {
      if (!failed) delegate.onComplete();
    }

    synchronized void cancel(Throwable error) {
      if (!failed) {
        failed = true;
        if (subscription != null) subscription.cancel();
        delegate.onError(error);
      }
    }
  }

  static final class ResponseTooLarge extends IOException {}

  String chat(List<Map<String, String>> messages) {
    if (
      messages
        .stream()
        .mapToLong(m -> m.getOrDefault("content", "").length())
        .sum() > maxInputCharacters
    ) throw new ResponseStatusException(BAD_REQUEST, "对话内容超过输入预算，请清空历史或精简问题");
    var result = call(
      "/chat/completions",
      Map.of("model", model, "messages", messages, "stream", false, "max_tokens", maxOutputTokens)
    );
    var content = result.path("choices").path(0).path("message").path("content");
    if (!content.isTextual()) throw new ResponseStatusException(
      BAD_GATEWAY,
      "模型回答格式无效，需要文本内容"
    );
    String answer = content.textValue();
    if (answer.isBlank()) throw new ResponseStatusException(
      BAD_GATEWAY,
      "模型没有返回回答，请检查模型兼容性"
    );
    return answer;
  }

  List<double[]> embed(List<String> text) {
    if (embeddingModel.isBlank()) throw new ResponseStatusException(
      BAD_REQUEST,
      "尚未配置 AI_EMBEDDING_MODEL，可直接使用关键词检索"
    );
    var data = call(
      "/embeddings",
      Map.of("model", embeddingModel, "input", text, "encoding_format", "float")
    ).path("data");
    if (!data.isArray() || data.size() != text.size()) throw new ResponseStatusException(
      BAD_GATEWAY,
      "向量模型返回数量不匹配"
    );
    var result = new ArrayList<double[]>(Collections.nCopies(text.size(), null));
    int dimensions = -1;
    for (var row : data) {
      var position = row.path("index");
      if (
        !position.isIntegralNumber() || !position.canConvertToInt()
      ) throw new ResponseStatusException(BAD_GATEWAY, "向量索引必须是整数");
      int index = position.intValue();
      var values = row.path("embedding");
      if (
        index < 0 ||
        index >= text.size() ||
        result.get(index) != null ||
        !values.isArray() ||
        values.isEmpty() ||
        values.size() > 8192
      ) throw new ResponseStatusException(BAD_GATEWAY, "向量模型响应无效");
      if (dimensions != -1 && dimensions != values.size()) throw new ResponseStatusException(
        BAD_GATEWAY,
        "向量维度不一致"
      );
      dimensions = values.size();
      double[] vector = new double[dimensions];
      for (int i = 0; i < vector.length; i++) {
        if (!values.get(i).isNumber()) throw new ResponseStatusException(
          BAD_GATEWAY,
          "向量元素必须是数值"
        );
        vector[i] = values.get(i).doubleValue();
        if (!Double.isFinite(vector[i])) throw new ResponseStatusException(
          BAD_GATEWAY,
          "向量模型响应无效"
        );
      }
      result.set(index, vector);
    }
    return result;
  }
}
