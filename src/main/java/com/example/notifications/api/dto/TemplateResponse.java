package com.example.notifications.api.dto;

import com.example.notifications.domain.model.Channel;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class TemplateResponse {
    private UUID id;
    private String name;
    private Channel channel;
    private String subject;
    private String body;
    private Integer version;
    private Boolean active;
    private Instant createdAt;
}
