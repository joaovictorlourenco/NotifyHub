package com.example.notifications.api.dto;

import com.example.notifications.domain.model.Channel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TemplateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Channel is required")
    private Channel channel;

    private String subject;

    @NotBlank(message = "Body is required")
    private String body;
}
