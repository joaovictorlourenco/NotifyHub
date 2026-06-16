package com.example.notifications;

import com.example.notifications.domain.model.Channel;
import com.example.notifications.domain.model.Notification;
import com.example.notifications.domain.model.Status;
import com.example.notifications.domain.model.Template;
import com.example.notifications.domain.service.AuditService;
import com.example.notifications.domain.service.NotificationService;
import com.example.notifications.domain.service.TemplateService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
    "spring.activemq.broker-url=vm://localhost?broker.persistent=false",
    "spring.jpa.hibernate.ddl-auto=update"
})
class NotificationSystemApplicationTests {

	@Autowired
	private NotificationService notificationService;

	@Autowired
	private TemplateService templateService;

	@Autowired
	private AuditService auditService;

	@Test
	void testCreateAndSendNotificationFlow() throws Exception {
		// 1. Create a Template
		Template template = Template.builder()
				.name("welcome-test")
				.channel(Channel.EMAIL)
				.subject("Hello {{name}}")
				.body("Welcome to {{app}}!")
				.build();
		Template savedTemplate = templateService.createTemplate(template);
		assertThat(savedTemplate.getId()).isNotNull();

		// 2. Create and Queue a Notification
		Map<String, Object> vars = new HashMap<>();
		vars.put("name", "John Doe");
		vars.put("app", "TestApp");

		Notification notification = notificationService.createNotification(
				"john.doe@example.com",
				Channel.EMAIL,
				savedTemplate.getId(),
				vars
		);
		UUID notificationId = notification.getId();
		assertThat(notificationId).isNotNull();
		assertThat(notification.getStatus()).isEqualTo(Status.PENDING);

		// 3. Poll for the worker to process the notification
		Notification updatedNotif = null;
		for (int i = 0; i < 30; i++) {
			Thread.sleep(200);
			updatedNotif = notificationService.getNotificationById(notificationId);
			if (updatedNotif.getStatus() == Status.SENT) {
				break;
			}
		}

		assertThat(updatedNotif).isNotNull();
		assertThat(updatedNotif.getStatus()).isEqualTo(Status.SENT);
		assertThat(updatedNotif.getSentAt()).isNotNull();

		// 4. Verify Audit logs
		var logs = auditService.getLogsByNotificationId(notificationId);
		assertThat(logs).hasSize(2); // CREATED and SENT
		assertThat(logs.get(0).getEvent().toString()).isEqualTo("SENT");
		assertThat(logs.get(1).getEvent().toString()).isEqualTo("CREATED");
	}
}
