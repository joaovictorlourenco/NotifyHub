package com.example.notifications.domain.service;

import com.example.notifications.domain.model.Template;
import com.example.notifications.domain.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TemplateService {

    private final TemplateRepository templateRepository;

    @Transactional
    public Template createTemplate(Template template) {
        log.info("Creating new template: {}", template.getName());
        return templateRepository.save(template);
    }

    @Transactional(readOnly = true)
    public List<Template> getActiveTemplates() {
        return templateRepository.findByActiveTrue();
    }

    @Transactional(readOnly = true)
    public Template getTemplateById(UUID id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Template not found with ID: " + id));
    }
}
