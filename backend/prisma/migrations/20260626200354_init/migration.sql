-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TECH',
    "clientId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "document" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "telegramChatId" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "maxEquipments" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "equipments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "checkType" TEXT NOT NULL DEFAULT 'PING',
    "port" INTEGER,
    "location" TEXT,
    "clientId" TEXT,
    "groupName" TEXT,
    "checkInterval" INTEGER NOT NULL DEFAULT 60,
    "failThreshold" INTEGER NOT NULL DEFAULT 3,
    "alertCooldown" INTEGER NOT NULL DEFAULT 300,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "lastCheck" DATETIME,
    "lastOnline" DATETIME,
    "lastOffline" DATETIME,
    "avgResponseTime" REAL NOT NULL DEFAULT 0,
    "uptimePercent" REAL NOT NULL DEFAULT 100,
    "totalUptime" INTEGER NOT NULL DEFAULT 0,
    "totalDowntime" INTEGER NOT NULL DEFAULT 0,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "telegramAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webhookAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "equipments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "responseTime" REAL,
    "statusCode" INTEGER,
    "error" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "alertChannel" TEXT,
    "alertMessage" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipment_checks_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT,
    "message" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alerts_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiUrl" TEXT,
    "apiKey" TEXT,
    "extraConfig" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT NOT NULL,
    "headers" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" DATETIME,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "maintenance_windows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_windows_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_windows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "escalation_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL,
    "targetRole" TEXT NOT NULL,
    "targetContact" TEXT,
    "channel" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    CONSTRAINT "escalation_rules_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_clientId_idx" ON "users"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_internalId_key" ON "equipments"("internalId");

-- CreateIndex
CREATE INDEX "equipments_clientId_idx" ON "equipments"("clientId");

-- CreateIndex
CREATE INDEX "equipments_status_idx" ON "equipments"("status");

-- CreateIndex
CREATE INDEX "equipments_monitoringEnabled_idx" ON "equipments"("monitoringEnabled");

-- CreateIndex
CREATE INDEX "equipments_internalId_idx" ON "equipments"("internalId");

-- CreateIndex
CREATE INDEX "equipment_checks_equipmentId_idx" ON "equipment_checks"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_checks_checkedAt_idx" ON "equipment_checks"("checkedAt");

-- CreateIndex
CREATE INDEX "equipment_checks_equipmentId_checkedAt_idx" ON "equipment_checks"("equipmentId", "checkedAt");

-- CreateIndex
CREATE INDEX "alerts_equipmentId_idx" ON "alerts"("equipmentId");

-- CreateIndex
CREATE INDEX "alerts_sentAt_idx" ON "alerts"("sentAt");

-- CreateIndex
CREATE INDEX "alerts_type_idx" ON "alerts"("type");

-- CreateIndex
CREATE INDEX "alerts_channel_idx" ON "alerts"("channel");

-- CreateIndex
CREATE INDEX "maintenance_windows_equipmentId_idx" ON "maintenance_windows"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_windows_startAt_endAt_idx" ON "maintenance_windows"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "escalation_rules_equipmentId_idx" ON "escalation_rules"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
