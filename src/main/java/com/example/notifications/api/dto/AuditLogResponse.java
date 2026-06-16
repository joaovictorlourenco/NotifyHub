package com.example.notifications.api.dto;

import com.example.notifications.domain.model.NotificationEvent;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class AuditLogResponse {
    private UUID id;
    private UUID notificationId;
    private NotificationEvent event;
    private String detail;
    private Instant occurredAt;
}
