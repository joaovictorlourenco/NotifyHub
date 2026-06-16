package com.example.notifications.api.mapper;

import com.example.notifications.api.dto.TemplateRequest;
import com.example.notifications.api.dto.TemplateResponse;
import com.example.notifications.domain.model.Template;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;

@Mapper(componentModel = "spring")
public interface TemplateMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Template toEntity(TemplateRequest request);

    TemplateResponse toResponse(Template entity);
    
    List<TemplateResponse> toResponseList(List<Template> entities);
}
