package com.example.notifications.domain.service;

import com.example.notifications.api.dto.MetricsSummaryResponse;
import com.example.notifications.domain.model.*;
import com.example.notifications.domain.repository.NotificationRepository;
import com.example.notifications.messaging.NotificationPublisher;
import com.example.notifications.sender.NotificationSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final TemplateService templateService;
    private final AuditService auditService;
    private final NotificationPublisher notificationPublisher;
    private final List<NotificationSender> senders;

    @Transactional
    public Notification createNotification(String recipient, Channel channel, UUID templateId, Map<String, Object> variables) {
        log.info("Creating notification for recipient {} via {}", recipient, channel);

        Template template = null;
        if (templateId != null) {
            template = templateService.getTemplateById(templateId);
            if (template.getChannel() != channel) {
                throw new IllegalArgumentException("Template channel does not match notification channel");
            }
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .channel(channel)
                .status(Status.PENDING)
                .template(template)
                .variables(variables)
                .build();

        notification = notificationRepository.save(notification);

        // Audit the creation
        auditService.logEvent(notification, NotificationEvent.CREATED, "Notification record created with PENDING status");

        // Publish to ActiveMQ queue
        notificationPublisher.publish(notification.getId());

        return notification;
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotifications(Status status, Channel channel, Instant startDate, Instant endDate) {
        return notificationRepository.findFiltered(status, channel, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public Notification getNotificationById(UUID id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));
    }

    @Transactional
    public void processNotification(UUID notificationId) {
        log.info("Worker: Processing notification ID: {}", notificationId);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found for processing: " + notificationId));

        if (notification.getStatus() != Status.PENDING) {
            log.warn("Notification {} is already processed (Status: {}). Skipping.", notificationId, notification.getStatus());
            return;
        }

        // Find appropriate sender
        NotificationSender sender = senders.stream()
                .filter(s -> s.supports(notification))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No sender found for channel: " + notification.getChannel()));

        try {
            sender.send(notification);
            notification.setStatus(Status.SENT);
            notification.setSentAt(Instant.now());
            notificationRepository.save(notification);
            auditService.logEvent(notification, NotificationEvent.SENT, "Notification successfully sent via " + notification.getChannel());
        } catch (Exception e) {
            log.error("Failed to send notification " + notificationId, e);
            notification.setStatus(Status.FAILED);
            notificationRepository.save(notification);
            auditService.logEvent(notification, NotificationEvent.FAILED, "Failed to send: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<MetricsSummaryResponse.MetricRow> getMetricsSummary() {
        List<Object[]> rawMetrics = notificationRepository.getMetricsSummaryRaw();
        return rawMetrics.stream()
                .map(row -> {
                    String channel = (String) row[0];
                    String status = (String) row[1];
                    Long total = row[2] != null ? ((Number) row[2]).longValue() : 0L;
                    Long last24h = row[3] != null ? ((Number) row[3]).longValue() : 0L;
                    Double avgSecondsToSend = row[4] != null ? ((Number) row[4]).doubleValue() : 0.0;
                    return new MetricsSummaryResponse.MetricRow(channel, status, total, last24h, avgSecondsToSend);
                })
                .toList();
    }
}
