package com.example.notifications.messaging;

import java.io.Serializable;
import java.util.UUID;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationMessage implements Serializable {
    private static final long serialVersionUID = 1L;
    private UUID notificationId;
}
