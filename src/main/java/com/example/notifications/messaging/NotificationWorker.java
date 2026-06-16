package com.example.notifications.messaging;

import com.example.notifications.config.JmsConfig;
import com.example.notifications.domain.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationWorker {

    private final NotificationService notificationService;

    @JmsListener(destination = JmsConfig.NOTIFICATION_QUEUE)
    @Async("taskExecutor")
    public void onMessage(NotificationMessage message) {
        log.info("Received message from queue for notification: {}", message.getNotificationId());
        try {
            notificationService.processNotification(message.getNotificationId());
        } catch (Exception e) {
            log.error("Error processing notification " + message.getNotificationId() + " in worker", e);
        }
    }
}
