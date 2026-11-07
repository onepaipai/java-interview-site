package dev.interview.shared;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {

  @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
  ResponseEntity<Error> denied(Exception error) {
    return error(403, "权限不足");
  }

  @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
  ResponseEntity<Error> missing(Exception error) {
    return error(404, "资源不存在");
  }

  public record Error(String code, String message) {}

  private static ResponseEntity<Error> error(int status, String message) {
    var value = HttpStatus.resolve(status);
    return ResponseEntity.status(status).body(
      new Error(value == null ? "REQUEST_FAILED" : value.name(), message)
    );
  }

  @ExceptionHandler(java.nio.charset.CharacterCodingException.class)
  ResponseEntity<Error> encoding(Exception e) {
    return error(400, "文件必须使用 UTF-8 编码");
  }

  @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
  ResponseEntity<Error> size(Exception e) {
    return error(413, "上传文件过大");
  }

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Error> status(ResponseStatusException e) {
    return error(e.getStatusCode().value(), e.getReason() == null ? "请求失败" : e.getReason());
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    IllegalArgumentException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
    org.springframework.web.bind.MissingServletRequestParameterException.class,
  })
  ResponseEntity<Error> invalid(Exception e) {
    return error(400, "参数无效，请检查字段和文件格式");
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Error> duplicate(Exception e) {
    return error(409, "名称已存在，或该记录仍被其他数据引用");
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Error> unexpected(Exception e) {
    return error(500, "服务器内部错误");
  }
}
