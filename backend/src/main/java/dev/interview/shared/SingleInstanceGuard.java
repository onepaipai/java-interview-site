package dev.interview.shared;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.channels.*;
import java.nio.file.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Prevents accidental replicas sharing the production upload volume. Not a distributed lease. */
@Component
public class SingleInstanceGuard implements AutoCloseable {

  @Value("${app.instance-mode:single}")
  private String mode = "single";

  @jakarta.annotation.PostConstruct
  void validateMode() {
    if (!mode.equals("single")) throw new IllegalArgumentException(
      "当前仅支持 app.instance-mode=single"
    );
  }

  private FileChannel channel;
  private FileLock lock;

  public SingleInstanceGuard(
    @Value("${app.single-instance-lock:false}") boolean enabled,
    @Value("${app.upload-dir}") String uploadDir
  ) throws IOException {
    if (!enabled) return;
    Path directory = Path.of(uploadDir).toAbsolutePath();
    Files.createDirectories(directory);
    channel = FileChannel.open(
      directory.resolve(".backend-instance.lock"),
      StandardOpenOption.CREATE,
      StandardOpenOption.WRITE
    );
    try {
      lock = channel.tryLock();
      if (lock == null) throw new IllegalStateException("只支持单后端实例：共享上传卷已有实例运行");
    } catch (Exception error) {
      channel.close();
      throw new IllegalStateException("无法获得单实例锁，请确认没有重复后端进程", error);
    }
  }

  @PreDestroy
  public void close() throws IOException {
    if (lock != null && lock.isValid()) lock.release();
    if (channel != null) channel.close();
  }
}
