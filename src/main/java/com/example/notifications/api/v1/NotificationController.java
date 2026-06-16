package com.example.notifications.api.v1;

import com.example.notifications.api.dto.NotificationRequest;
import com.example.notifications.api.dto.NotificationResponse;
import com.example.notifications.api.mapper.NotificationMapper;
import com.example.notifications.domain.model.Channel;
import com.example.notifications.domain.model.Notification;
import com.example.notifications.domain.model.Status;
import com.example.notifications.domain.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Notifications", description = "Endpoints for sending and tracking notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationMapper notificationMapper;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create and queue a new notification")
    public NotificationResponse createNotification(@Valid @RequestBody NotificationRequest request) {
        Notification notification = notificationService.createNotification(
                request.getRecipient(),
                request.getChannel(),
                request.getTemplateId(),
                request.getVariables()
        );
        return notificationMapper.toResponse(notification);
    }

    @GetMapping
    @Operation(summary = "Get filtered list of notifications")
    public List<NotificationResponse> getNotifications(
            @RequestParam(required = false) Status status,
            @RequestParam(required = false) Channel channel,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate) {

        List<Notification> list = notificationService.getNotifications(status, channel, startDate, endDate);
        return notificationMapper.toResponseList(list);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get notification details by ID")
    public NotificationResponse getNotificationById(@PathVariable UUID id) {
        Notification notification = notificationService.getNotificationById(id);
        return notificationMapper.toResponse(notification);
    }
}
