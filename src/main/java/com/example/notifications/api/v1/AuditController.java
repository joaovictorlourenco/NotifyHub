package com.example.notifications.api.v1;

import com.example.notifications.api.dto.AuditLogResponse;
import com.example.notifications.api.mapper.AuditLogMapper;
import com.example.notifications.domain.model.AuditLog;
import com.example.notifications.domain.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Audit", description = "Endpoints for viewing notification audit logs")
public class AuditController {

    private final AuditService auditService;
    private final AuditLogMapper auditLogMapper;

    @GetMapping("/{notificationId}")
    @Operation(summary = "Get audit logs of a specific notification by ID")
    public List<AuditLogResponse> getAuditLogs(@PathVariable UUID notificationId) {
        List<AuditLog> logs = auditService.getLogsByNotificationId(notificationId);
        return auditLogMapper.toResponseList(logs);
    }
}
