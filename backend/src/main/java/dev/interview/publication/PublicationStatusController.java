package dev.interview.publication;

import org.springframework.web.bind.annotation.*;

/** Read-only reconciliation; publication never overwrites a human-edited answer. */
@RestController
public class PublicationStatusController {

  private final PublicationStatusService service;

  public PublicationStatusController(PublicationStatusService service) {
    this.service = service;
  }

  @GetMapping("/api/admin/publications/status")
  public Object status() {
    return service.status();
  }
}
