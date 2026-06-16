package com.example.notifications.api.mapper;

import com.example.notifications.api.dto.NotificationRequest;
import com.example.notifications.api.dto.NotificationResponse;
import com.example.notifications.domain.model.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;

@Mapper(componentModel = "spring")
public interface NotificationMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "template", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "sentAt", ignore = true)
    Notification toEntity(NotificationRequest request);

    @Mapping(source = "template.id", target = "templateId")
    NotificationResponse toResponse(Notification entity);

    List<NotificationResponse> toResponseList(List<Notification> entities);
}
