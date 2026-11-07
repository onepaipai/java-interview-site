package dev.interview.knowledge;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import dev.interview.shared.OperationalMetrics;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Flow;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ModelClientTest {

  @Test
  void bodyDeadlineCancelsStalledAndDribblingBodiesAndReleasesAiSlots() throws Exception {
    var mode = new java.util.concurrent.atomic.AtomicReference<>("stall");
    var headers = new java.util.concurrent.atomic.AtomicInteger();
    var executor = java.util.concurrent.Executors.newCachedThreadPool();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.setExecutor(executor);
    server.createContext("/v1/chat/completions", exchange -> {
      exchange.getRequestBody().readAllBytes();
      exchange.sendResponseHeaders(200, 0);
      try (var out = exchange.getResponseBody()) {
        if (mode.get().equals("ok")) {
          out.write(
            "{\"choices\":[{\"message\":{\"content\":\"recovered\"}}]}".getBytes(
              StandardCharsets.UTF_8
            )
          );
          return;
        }
        String current = mode.get();
        out.write('{');
        out.flush();
        headers.incrementAndGet();
        if (current.equals("stall")) Thread.sleep(1500);
        else for (int i = 0; i < 40; i++) {
          Thread.sleep(40);
          out.write(' ');
          out.flush();
        }
      } catch (java.io.IOException ignored) {
      } catch (InterruptedException error) {
        Thread.currentThread().interrupt();
      }
    });
    server.start();
    try {
      var client = new ModelClient(
        new ObjectMapper(),
        "http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
        "",
        "chat",
        "",
        true
      );
      client.chatTimeoutMs = 350;
      var gate = new AiGate(10, 2, new OperationalMetrics());
      for (String shape : List.of("stall", "dribble")) {
        mode.set(shape);
        long start = System.nanoTime();
        var error = assertThrows(ResponseStatusException.class, () ->
          gate.execute(
            () -> "reader",
            () -> client.chat(List.of(Map.of("role", "user", "content", "test")))
          )
        );
        assertEquals(504, error.getStatusCode().value());
        assertTrue(
          java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start) < 2000
        );
        assertEquals(2, gate.availableSlots());
      }
      assertEquals(2, headers.get());
      mode.set("ok");
      assertEquals(
        "recovered",
        gate.execute(
          () -> "reader",
          () -> client.chat(List.of(Map.of("role", "user", "content", "test")))
        )
      );
      assertEquals(2, gate.availableSlots());
    } finally {
      server.stop(0);
      executor.shutdownNow();
    }
  }

  @Test
  void completeInputBudgetIsCheckedBeforeCallingTheProvider() {
    var client = new ModelClient(new ObjectMapper(), "http://127.0.0.1:1/v1", "", "chat", "", true);
    client.maxInputCharacters = 4;
    assertEquals(
      400,
      assertThrows(ResponseStatusException.class, () ->
        client.chat(List.of(Map.of("content", "12345")))
      )
        .getStatusCode()
        .value()
    );
  }

  @Test
  void oversizedBodyCancelsBeforeBufferingAndIgnoresFurtherData() {
    var body = new ModelClient.BoundedBody();
    var subscription = mock(Flow.Subscription.class);
    body.onSubscribe(subscription);
    body.onNext(List.of(ByteBuffer.allocate(ModelClient.MAX_RESPONSE_BYTES)));
    body.onNext(List.of(ByteBuffer.allocate(1)));
    body.onNext(List.of(ByteBuffer.allocate(16)));
    body.onComplete();
    verify(subscription, times(1)).cancel();
    var failure = assertThrows(java.util.concurrent.CompletionException.class, () ->
      body.getBody().toCompletableFuture().join()
    );
    assertInstanceOf(ModelClient.ResponseTooLarge.class, failure.getCause());
  }

  @Test
  void exactLimitAndChunkedMultibyteBodyArePreserved() {
    var body = new ModelClient.BoundedBody();
    body.onSubscribe(mock(Flow.Subscription.class));
    byte[] bytes = "中文回答".getBytes(StandardCharsets.UTF_8);
    body.onNext(List.of(ByteBuffer.wrap(bytes, 0, 2)));
    body.onNext(List.of(ByteBuffer.wrap(bytes, 2, bytes.length - 2)));
    body.onComplete();
    assertArrayEquals(bytes, body.getBody().toCompletableFuture().join());
    var limit = new ModelClient.BoundedBody();
    limit.onSubscribe(mock(Flow.Subscription.class));
    limit.onNext(List.of(ByteBuffer.allocate(ModelClient.MAX_RESPONSE_BYTES)));
    limit.onComplete();
    assertEquals(
      ModelClient.MAX_RESPONSE_BYTES,
      limit.getBody().toCompletableFuture().join().length
    );
  }

  @Test
  void httpProviderWithAnOversizedChunkedResponseReturnsClearError() throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/v1/chat/completions", exchange -> {
      exchange.getRequestBody().readAllBytes();
      exchange.sendResponseHeaders(200, 0);
      try (var out = exchange.getResponseBody()) {
        out.write(new byte[ModelClient.MAX_RESPONSE_BYTES + 10000]);
      } catch (java.io.IOException ignored) {
        /* Client is expected to cancel the oversized body. */
      }
    });
    server.start();
    try {
      var client = new ModelClient(
        new ObjectMapper(),
        "http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
        "",
        "test",
        "",
        true
      );
      var error = assertThrows(ResponseStatusException.class, () ->
        client.chat(List.of(Map.of("role", "user", "content", "测试")))
      );
      assertEquals(502, error.getStatusCode().value());
      assertEquals("模型返回内容过大", error.getReason());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void malformedProviderPayloadsFailAsGatewayErrors() throws Exception {
    var payload = new java.util.concurrent.atomic.AtomicReference<String>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/v1/", exchange -> {
      exchange.getRequestBody().readAllBytes();
      byte[] bytes = payload.get().getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200, bytes.length);
      try (var out = exchange.getResponseBody()) {
        out.write(bytes);
      }
    });
    server.start();
    try {
      var client = new ModelClient(
        new ObjectMapper(),
        "http://127.0.0.1:" + server.getAddress().getPort() + "/v1",
        "",
        "chat",
        "embed",
        true
      );
      for (String body : List.of(
        " ",
        "null",
        "[]",
        "{\"choices\":[{\"message\":{\"content\":123}}]}"
      )) {
        payload.set(body);
        var error = assertThrows(ResponseStatusException.class, () ->
          client.chat(List.of(Map.of("role", "user", "content", "test")))
        );
        assertEquals(502, error.getStatusCode().value(), body);
      }
      for (String body : List.of(
        "{\"data\":[{\"index\":0.5,\"embedding\":[1,2]}]}",
        "{\"data\":[{\"index\":\"0\",\"embedding\":[1,2]}]}",
        "{\"data\":[{\"index\":0,\"embedding\":[\"1\",2]}]}"
      )) {
        payload.set(body);
        assertEquals(
          502,
          assertThrows(ResponseStatusException.class, () -> client.embed(List.of("test")))
            .getStatusCode()
            .value()
        );
      }
      payload.set("{\"data\":[{\"index\":0,\"embedding\":[1,2]},{\"index\":1,\"embedding\":[3]}]}");
      assertEquals(
        502,
        assertThrows(ResponseStatusException.class, () -> client.embed(List.of("one", "two")))
          .getStatusCode()
          .value()
      );
      payload.set(
        "{\"data\":[{\"index\":1,\"embedding\":[3,4]},{\"index\":0,\"embedding\":[1,2]}]}"
      );
      var vectors = client.embed(List.of("one", "two"));
      assertArrayEquals(new double[] { 1, 2 }, vectors.get(0));
      assertArrayEquals(new double[] { 3, 4 }, vectors.get(1));
    } finally {
      server.stop(0);
    }
  }
}
