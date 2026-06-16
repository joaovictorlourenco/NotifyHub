package com.example.notifications.sender;

import com.example.notifications.domain.model.Notification;

public interface NotificationSender {
    void send(Notification notification) throws Exception;
    boolean supports(Notification notification);
}
