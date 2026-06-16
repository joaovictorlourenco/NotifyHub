package com.example.notifications.messaging;

import com.example.notifications.config.JmsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationPublisher {

    private final JmsTemplate jmsTemplate;

    public void publish(UUID notificationId) {
        log.info("Publishing notification ID {} to queue {}", notificationId, JmsConfig.NOTIFICATION_QUEUE);
        NotificationMessage message = new NotificationMessage(notificationId);
        jmsTemplate.convertAndSend(JmsConfig.NOTIFICATION_QUEUE, message);
    }
}
