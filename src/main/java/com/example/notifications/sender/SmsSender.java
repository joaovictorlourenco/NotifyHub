package com.example.notifications.sender;

import com.example.notifications.domain.model.Channel;
import com.example.notifications.domain.model.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SmsSender implements NotificationSender {

    @Override
    public void send(Notification notification) throws Exception {
        log.info("Starting to send SMS to {}...", notification.getRecipient());
        // Simulate network delay
        Thread.sleep(500);
        log.info("SMS sent successfully to {}", notification.getRecipient());
    }

    @Override
    public boolean supports(Notification notification) {
        return notification.getChannel() == Channel.SMS;
    }
}
