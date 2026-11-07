package dev.interview.account;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rejects blocked login attempts with 429 before authentication runs, then feeds the outcome back
 * into the throttle. Runs inside the security chain after CSRF validation, so blind request
 * floods still need a valid token to reach the counter.
 */
class LoginThrottleFilter extends OncePerRequestFilter {

  private static final AntPathRequestMatcher LOGIN = new AntPathRequestMatcher(
    "/api/login",
    "POST"
  );

  private final LoginThrottle throttle;

  LoginThrottleFilter(LoginThrottle throttle) {
    this.throttle = throttle;
  }

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain chain
  ) throws ServletException, IOException {
    if (!LOGIN.matches(request)) {
      chain.doFilter(request, response);
      return;
    }
    String username = request.getParameter("username");
    String ip = request.getRemoteAddr();
    if (throttle.blocked(username, ip)) {
      response.setStatus(429);
      response.setContentType("application/json;charset=UTF-8");
      response.setHeader(
        "Retry-After",
        String.valueOf(Math.round(Math.ceil(throttle.retryAfterMillis(username, ip) / 1000.0)))
      );
      response
        .getWriter()
        .write("{\"code\":\"TOO_MANY_REQUESTS\",\"message\":\"登录尝试过于频繁，请稍后再试\"}");
      return;
    }
    try {
      chain.doFilter(request, response);
    } finally {
      int status = response.getStatus();
      if (status == 401) throttle.recordFailure(username, ip);
      else if (status < 400) throttle.recordSuccess(username, ip);
    }
  }
}
