package com.example.notifications.api.mapper;

import com.example.notifications.api.dto.AuditLogResponse;
import com.example.notifications.domain.model.AuditLog;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;

@Mapper(componentModel = "spring")
public interface AuditLogMapper {
    @Mapping(source = "notification.id", target = "notificationId")
    AuditLogResponse toResponse(AuditLog entity);

    List<AuditLogResponse> toResponseList(List<AuditLog> entities);
}
