-- V1__create_notifications.sql
CREATE TABLE templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    channel     VARCHAR(10)  NOT NULL CHECK (channel IN ('EMAIL','SMS')),
    subject     VARCHAR(200),
    body        TEXT         NOT NULL,
    version     INT          NOT NULL DEFAULT 1,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient    VARCHAR(200) NOT NULL,
    channel      VARCHAR(10)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    template_id  UUID         REFERENCES templates(id),
    variables    JSONB,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    sent_at      TIMESTAMPTZ
);

CREATE TABLE audit_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id  UUID         NOT NULL REFERENCES notifications(id),
    event            VARCHAR(50)  NOT NULL,
    detail           TEXT,
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_status  ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_audit_notification_id ON audit_log(notification_id);
