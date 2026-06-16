package com.example.notifications.domain.repository;

import com.example.notifications.domain.model.Channel;
import com.example.notifications.domain.model.Notification;
import com.example.notifications.domain.model.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    
    @Query("SELECT n FROM Notification n WHERE " +
           "(:status IS NULL OR n.status = :status) AND " +
           "(:channel IS NULL OR n.channel = :channel) AND " +
           "(:startDate IS NULL OR n.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR n.createdAt <= :endDate) " +
           "ORDER BY n.createdAt DESC")
    List<Notification> findFiltered(
            @Param("status") Status status,
            @Param("channel") Channel channel,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    @Query(value = "SELECT " +
            "    channel, " +
            "    status, " +
            "    COUNT(*)                                                            AS total, " +
            "    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24h')       AS last_24h, " +
            "    AVG(EXTRACT(EPOCH FROM (sent_at - created_at)))                     AS avg_seconds_to_send " +
            "FROM notifications " +
            "GROUP BY ROLLUP(channel, status) " +
            "ORDER BY channel, status", nativeQuery = true)
    List<Object[]> getMetricsSummaryRaw();
}
