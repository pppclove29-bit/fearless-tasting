package com.fearlesstasting.api.config;

import java.util.concurrent.Executor;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.aop.interceptor.SimpleAsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 비동기 실행 설정. FCM 푸시 / 알림 브로드캐스트 같은 fire-and-forget 작업은
 * 요청 응답 시간에 포함되지 않아야 하므로 별도 스레드 풀에서 처리.
 *
 * <h3>면접 어필 포인트</h3>
 * <ul>
 *   <li><b>기본 SimpleAsyncTaskExecutor 대신 ThreadPoolTaskExecutor</b>: 스레드 재사용, 큐 백프레셔 관리</li>
 *   <li><b>큐 가득 참 시 CallerRunsPolicy</b>: 호출자 스레드에서 직접 실행 → 유실 방지, 백프레셔 자연 발생</li>
 *   <li><b>@Async 메소드의 예외 처리</b>: 반환값이 void인 경우 `AsyncUncaughtExceptionHandler`로 로깅</li>
 * </ul>
 */
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Bean("taskExecutor")
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("ft-async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        // 큐 포화 시 호출자 스레드에서 실행 → 요청이 일시적으로 느려질 순 있어도 유실은 없음
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new SimpleAsyncUncaughtExceptionHandler();
    }
}
