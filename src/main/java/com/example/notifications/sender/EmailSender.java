package com.example.notifications.sender;

import com.example.notifications.domain.model.Channel;
import com.example.notifications.domain.model.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class EmailSender implements NotificationSender {

    @Override
    public void send(Notification notification) throws Exception {
        log.info("Starting to send Email to {}...", notification.getRecipient());
        // Simulate network delay
        Thread.sleep(1000);
        log.info("Email sent successfully to {}", notification.getRecipient());
    }

    @Override
    public boolean supports(Notification notification) {
        return notification.getChannel() == Channel.EMAIL;
    }
}
