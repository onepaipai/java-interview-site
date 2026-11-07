package dev.interview.account;

import java.time.Clock;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
public class SecurityConfig {

  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  @Bean
  org.springframework.security.core.session.SessionRegistry sessionRegistry() {
    return new org.springframework.security.core.session.SessionRegistryImpl();
  }

  @Bean
  org.springframework.security.web.session.HttpSessionEventPublisher sessionEvents() {
    return new org.springframework.security.web.session.HttpSessionEventPublisher();
  }

  @Bean
  PasswordEncoder passwords() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService users(JdbcTemplate db) {
    return username ->
      db
        .query(
          "SELECT username,password,role FROM accounts WHERE username=?",
          (r, n) ->
            User.withUsername(r.getString(1))
              .password(r.getString(2))
              .roles(r.getString(3))
              .build(),
          username
        )
        .stream()
        .findFirst()
        .orElseThrow(() -> new UsernameNotFoundException("账号不存在"));
  }

  @Bean
  SecurityFilterChain chain(
    HttpSecurity http,
    org.springframework.security.core.session.SessionRegistry registry,
    LoginThrottle throttle
  ) throws Exception {
    return http
      .addFilterBefore(
        new LoginThrottleFilter(throttle),
        UsernamePasswordAuthenticationFilter.class
      )
      .sessionManagement(s ->
        s
          .maximumSessions(-1)
          .sessionRegistry(registry)
          .expiredSessionStrategy(e -> {
            var res = e.getResponse();
            res.setStatus(401);
            res.setContentType("application/json;charset=UTF-8");
            res
              .getWriter()
              .write("{\"code\":\"UNAUTHORIZED\",\"message\":\"账号信息已变更，请重新登录\"}");
          })
      )
      .authorizeHttpRequests(a ->
        a
          .requestMatchers(
            "/api/csrf",
            "/api/login",
            "/api/health",
            "/api/test-environment",
            "/error",
            "/",
            "/index.html",
            "/assets/**",
            "/favicon.ico"
          )
          .permitAll()
          .requestMatchers("/api/admin/**")
          .hasRole("ADMIN")
          .anyRequest()
          .authenticated()
      )
      .formLogin(f ->
        f
          .loginProcessingUrl("/api/login")
          .successHandler((req, res, auth) -> {
            res.setContentType("application/json");
            res.getWriter().write("{\"ok\":true}");
          })
          .failureHandler((req, res, e) -> {
            res.setStatus(401);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"账号或密码错误\"}");
          })
      )
      .logout(l ->
        l
          .logoutRequestMatcher(new AntPathRequestMatcher("/api/logout", "POST"))
          .logoutSuccessHandler((req, res, auth) -> res.setStatus(204))
      )
      .exceptionHandling(e ->
        e
          .authenticationEntryPoint((req, res, ex) -> {
            res.setStatus(401);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"请先登录\"}");
          })
          .accessDeniedHandler((req, res, ex) -> {
            res.setStatus(403);
            res.setContentType("application/json;charset=UTF-8");
            res
              .getWriter()
              .write("{\"code\":\"FORBIDDEN\",\"message\":\"权限不足或登录已过期，请刷新后重试\"}");
          })
      )
      .build();
  }
}
