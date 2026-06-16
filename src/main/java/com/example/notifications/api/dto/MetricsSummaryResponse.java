package com.example.notifications.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MetricsSummaryResponse {
    private List<MetricRow> metrics;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MetricRow {
        private String channel;
        private String status;
        private Long total;
        private Long last24h;
        private Double avgSecondsToSend;
    }
}
