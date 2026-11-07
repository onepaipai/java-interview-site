package dev.interview.question;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class UploadController {

  final Path root;

  UploadController(@Value("${app.upload-dir}") String path) throws IOException {
    root = Path.of(path).toAbsolutePath().normalize();
    Files.createDirectories(root);
  }

  @PostMapping("/api/admin/uploads")
  Map<String, String> upload(@RequestParam("file") MultipartFile file) throws IOException {
    if (file.isEmpty() || file.getSize() > 10_000_000) throw new IllegalArgumentException();
    try (var stream = ImageIO.createImageInputStream(file.getInputStream())) {
      var readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "只支持 PNG、JPEG、GIF 图片"
      );
      var reader = readers.next();
      try {
        reader.setInput(stream);
        String format = reader.getFormatName().toLowerCase(Locale.ROOT);
        if (
          !List.of("png", "jpeg", "jpg", "gif").contains(format) ||
          (long) reader.getWidth(0) * reader.getHeight(0) > 20_000_000
        ) throw new IllegalArgumentException();
        var image = reader.read(0);
        String name = UUID.randomUUID() + ".png";
        ImageIO.write(image, "png", root.resolve(name).toFile());
        return Map.of("url", "/uploads/" + name);
      } finally {
        reader.dispose();
      }
    }
  }

  @GetMapping("/uploads/{name}")
  ResponseEntity<Resource> read(@PathVariable String name) {
    if (!name.matches("[a-f0-9-]{36}\\.png")) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND
    );
    Path file = root.resolve(name).normalize();
    if (!file.startsWith(root) || !Files.isRegularFile(file)) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND
    );
    return ResponseEntity.ok()
      .contentType(MediaType.IMAGE_PNG)
      .header("X-Content-Type-Options", "nosniff")
      .body(new FileSystemResource(file));
  }
}
