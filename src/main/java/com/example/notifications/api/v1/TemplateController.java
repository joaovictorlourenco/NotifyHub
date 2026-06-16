package com.example.notifications.api.v1;

import com.example.notifications.api.dto.TemplateRequest;
import com.example.notifications.api.dto.TemplateResponse;
import com.example.notifications.api.mapper.TemplateMapper;
import com.example.notifications.domain.model.Template;
import com.example.notifications.domain.service.TemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Templates", description = "Endpoints for managing notification templates")
public class TemplateController {

    private final TemplateService templateService;
    private final TemplateMapper templateMapper;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new notification template")
    public TemplateResponse createTemplate(@Valid @RequestBody TemplateRequest request) {
        Template template = templateMapper.toEntity(request);
        Template created = templateService.createTemplate(template);
        return templateMapper.toResponse(created);
    }

    @GetMapping
    @Operation(summary = "List all active templates")
    public List<TemplateResponse> getActiveTemplates() {
        List<Template> activeTemplates = templateService.getActiveTemplates();
        return templateMapper.toResponseList(activeTemplates);
    }
}
