package com.example.notifications.api.v1;

import com.example.notifications.api.dto.MetricsSummaryResponse;
import com.example.notifications.domain.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Metrics", description = "Endpoints for retrieval of delivery metrics")
public class MetricsController {

    private final NotificationService notificationService;

    @GetMapping("/summary")
    @Operation(summary = "Get delivery metrics summarized by channel and status (with ROLLUP)")
    public MetricsSummaryResponse getSummary() {
        List<MetricsSummaryResponse.MetricRow> rows = notificationService.getMetricsSummary();
        return new MetricsSummaryResponse(rows);
    }
}
