package com.example.notifications.api.dto;

import com.example.notifications.domain.model.Channel;
import com.example.notifications.domain.model.Status;
import lombok.Data;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
public class NotificationResponse {
    private UUID id;
    private String recipient;
    private Channel channel;
    private Status status;
    private UUID templateId;
    private Map<String, Object> variables;
    private Instant createdAt;
    private Instant sentAt;
}
