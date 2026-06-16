package com.example.notifications.api.dto;

import com.example.notifications.domain.model.Channel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class NotificationRequest {
    @NotBlank(message = "Recipient is required")
    private String recipient;

    @NotNull(message = "Channel is required")
    private Channel channel;

    private UUID templateId;

    private Map<String, Object> variables;
}
