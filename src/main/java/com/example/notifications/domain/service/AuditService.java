package com.example.notifications.domain.service;

import com.example.notifications.domain.model.AuditLog;
import com.example.notifications.domain.model.Notification;
import com.example.notifications.domain.model.NotificationEvent;
import com.example.notifications.domain.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void logEvent(Notification notification, NotificationEvent event, String detail) {
        log.info("Logging audit event {} for notification {}", event, notification.getId());
        AuditLog auditLog = AuditLog.builder()
                .notification(notification)
                .event(event)
                .detail(detail)
                .build();
        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByNotificationId(UUID notificationId) {
        return auditLogRepository.findByNotificationIdOrderByOccurredAtDesc(notificationId);
    }
}
