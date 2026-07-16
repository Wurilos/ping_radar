// ==============================================
// PingAlert Pro — Database Seed
// ==============================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ---- System Settings ----
  const settings = [
    { key: 'default_check_interval', value: '60', description: 'Default check interval in seconds' },
    { key: 'default_fail_threshold', value: '3', description: 'Default consecutive failures before alert' },
    { key: 'default_alert_cooldown', value: '300', description: 'Minimum seconds between repeated alerts' },
    { key: 'quiet_hours_enabled', value: 'false', description: 'Enable quiet hours' },
    { key: 'quiet_hours_start', value: '22:00', description: 'Quiet hours start time' },
    { key: 'quiet_hours_end', value: '07:00', description: 'Quiet hours end time' },
    { key: 'global_maintenance', value: 'false', description: 'Global maintenance mode' },
    { key: 'telegram_enabled', value: 'true', description: 'Enable Telegram notifications' },
    { key: 'whatsapp_enabled', value: 'false', description: 'Enable WhatsApp notifications' },
    { key: 'webhook_enabled', value: 'true', description: 'Enable Webhook notifications' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { id: uuid(), ...s, updatedAt: new Date() },
    });
  }

  // ---- Clients ----
  const client1Id = uuid();
  const client2Id = uuid();
  const client3Id = uuid();

  await prisma.client.createMany({
    data: [
      {
        id: client1Id,
        name: 'TechCorp Solutions',
        company: 'TechCorp Solutions LTDA',
        document: '12.345.678/0001-90',
        phone: '(11) 3456-7890',
        whatsapp: '5511934567890',
        telegramChatId: '',
        email: 'contato@techcorp.com.br',
        address: 'Av. Paulista, 1000 - São Paulo/SP',
        notes: 'Cliente premium com SLA 99.9%',
        plan: 'ENTERPRISE',
        maxEquipments: 100,
        active: true,
      },
      {
        id: client2Id,
        name: 'NetLink Telecom',
        company: 'NetLink Telecom ME',
        document: '98.765.432/0001-10',
        phone: '(21) 2345-6789',
        whatsapp: '5521923456789',
        telegramChatId: '',
        email: 'suporte@netlink.com.br',
        address: 'Rua da Tecnologia, 500 - Rio de Janeiro/RJ',
        notes: 'Provedor de internet regional',
        plan: 'PRO',
        maxEquipments: 50,
        active: true,
      },
      {
        id: client3Id,
        name: 'StartUp Digital',
        company: 'StartUp Digital EIRELI',
        document: '11.222.333/0001-44',
        phone: '(31) 3344-5566',
        whatsapp: '5531933445566',
        telegramChatId: '',
        email: 'admin@startupdigital.io',
        address: 'Rua das Inovações, 42 - Belo Horizonte/MG',
        notes: 'Startup em crescimento',
        plan: 'BASIC',
        maxEquipments: 10,
        active: true,
      },
    ],
  });

  // ---- Users ----
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const techPassword = await bcrypt.hash('tech123', 12);
  const clientPassword = await bcrypt.hash('client123', 12);

  await prisma.user.createMany({
    data: [
      {
        id: uuid(),
        name: 'Administrador',
        email: 'admin@pingalert.pro',
        password: hashedPassword,
        role: 'ADMIN',
        active: true,
      },
      {
        id: uuid(),
        name: 'Carlos Técnico',
        email: 'carlos@pingalert.pro',
        password: techPassword,
        role: 'TECH',
        active: true,
      },
      {
        id: uuid(),
        name: 'Ana Suporte',
        email: 'ana@pingalert.pro',
        password: techPassword,
        role: 'TECH',
        active: true,
      },
      {
        id: uuid(),
        name: 'João TechCorp',
        email: 'joao@techcorp.com.br',
        password: clientPassword,
        role: 'CLIENT',
        clientId: client1Id,
        active: true,
      },
      {
        id: uuid(),
        name: 'Maria NetLink',
        email: 'maria@netlink.com.br',
        password: clientPassword,
        role: 'CLIENT',
        clientId: client2Id,
        active: true,
      },
    ],
  });

  // ---- Equipments ----
  const now = new Date();
  const equipments = [
    // TechCorp equipments
    {
      id: uuid(), internalId: 'TC-RTR-001', name: 'Router Principal TechCorp', host: '8.8.8.8',
      checkType: 'PING', location: 'Data Center SP', clientId: client1Id, groupName: 'Roteadores',
      checkInterval: 30, failThreshold: 3, alertCooldown: 300, status: 'ONLINE',
      monitoringEnabled: true, notes: 'MikroTik CCR1036 - Router principal', uptimePercent: 99.8,
      lastCheck: now, lastOnline: now, avgResponseTime: 12.5,
    },
    {
      id: uuid(), internalId: 'TC-SRV-001', name: 'Servidor Web Principal', host: '1.1.1.1',
      checkType: 'HTTP', location: 'Data Center SP', clientId: client1Id, groupName: 'Servidores',
      checkInterval: 60, failThreshold: 3, alertCooldown: 300, status: 'ONLINE',
      monitoringEnabled: true, notes: 'Nginx + Node.js production', uptimePercent: 99.95,
      lastCheck: now, lastOnline: now, avgResponseTime: 45.2,
    },
    {
      id: uuid(), internalId: 'TC-SW-001', name: 'Switch Core 48P', host: '192.168.1.1',
      checkType: 'PING', location: 'Rack A1 - Data Center', clientId: client1Id, groupName: 'Switches',
      checkInterval: 60, failThreshold: 5, alertCooldown: 600, status: 'ONLINE',
      monitoringEnabled: true, notes: 'Cisco Catalyst 2960X', uptimePercent: 99.99,
      lastCheck: now, lastOnline: now, avgResponseTime: 1.2,
    },
    {
      id: uuid(), internalId: 'TC-CAM-001', name: 'Câmera Entrada Principal', host: '192.168.10.50',
      checkType: 'TCP', port: 554, location: 'Portaria', clientId: client1Id, groupName: 'Câmeras',
      checkInterval: 120, failThreshold: 3, alertCooldown: 600, status: 'OFFLINE',
      monitoringEnabled: true, notes: 'Hikvision DS-2CD2143', uptimePercent: 95.3,
      consecutiveFailures: 5, lastCheck: now, lastOffline: now, avgResponseTime: 0,
    },
    // NetLink equipments
    {
      id: uuid(), internalId: 'NL-ANT-001', name: 'Antena Torre Central', host: '10.0.0.1',
      checkType: 'PING', location: 'Torre Central - RJ', clientId: client2Id, groupName: 'Antenas',
      checkInterval: 30, failThreshold: 3, alertCooldown: 300, status: 'ONLINE',
      monitoringEnabled: true, notes: 'Ubiquiti PowerBeam 5AC Gen2', uptimePercent: 98.5,
      lastCheck: now, lastOnline: now, avgResponseTime: 8.7,
    },
    {
      id: uuid(), internalId: 'NL-ANT-002', name: 'Antena Setor Norte', host: '10.0.1.1',
      checkType: 'PING', location: 'Torre Norte - RJ', clientId: client2Id, groupName: 'Antenas',
      checkInterval: 30, failThreshold: 3, alertCooldown: 300, status: 'UNSTABLE',
      monitoringEnabled: true, notes: 'Ubiquiti LiteBeam 5AC', uptimePercent: 92.1,
      consecutiveFailures: 1, lastCheck: now, lastOnline: now, avgResponseTime: 35.0,
    },
    {
      id: uuid(), internalId: 'NL-SRV-001', name: 'Servidor RADIUS', host: '10.0.0.10',
      checkType: 'TCP', port: 1812, location: 'Data Center - RJ', clientId: client2Id, groupName: 'Servidores',
      checkInterval: 60, failThreshold: 2, alertCooldown: 300, status: 'ONLINE',
      monitoringEnabled: true, notes: 'FreeRADIUS 3.0', uptimePercent: 99.7,
      lastCheck: now, lastOnline: now, avgResponseTime: 3.4,
    },
    {
      id: uuid(), internalId: 'NL-LNK-001', name: 'Link Internet Principal', host: 'google.com',
      checkType: 'HTTP', location: 'Data Center - RJ', clientId: client2Id, groupName: 'Links',
      checkInterval: 30, failThreshold: 3, alertCooldown: 300, status: 'ONLINE',
      monitoringEnabled: true, notes: 'Link dedicado 100Mbps', uptimePercent: 99.9,
      lastCheck: now, lastOnline: now, avgResponseTime: 22.0,
    },
    // StartUp Digital equipments
    {
      id: uuid(), internalId: 'SD-SRV-001', name: 'Servidor Aplicação', host: 'httpbin.org',
      checkType: 'HTTP', location: 'Cloud AWS', clientId: client3Id, groupName: 'Servidores',
      checkInterval: 60, failThreshold: 3, alertCooldown: 300, status: 'ONLINE',
      monitoringEnabled: true, notes: 'AWS EC2 t3.medium', uptimePercent: 99.95,
      lastCheck: now, lastOnline: now, avgResponseTime: 120.0,
    },
    {
      id: uuid(), internalId: 'SD-DVR-001', name: 'DVR Escritório', host: '192.168.0.200',
      checkType: 'TCP', port: 37777, location: 'Escritório BH', clientId: client3Id, groupName: 'DVRs',
      checkInterval: 120, failThreshold: 3, alertCooldown: 600, status: 'MAINTENANCE',
      monitoringEnabled: false, notes: 'Intelbras MHDX 3108 - Em manutenção', uptimePercent: 88.0,
      lastCheck: now, avgResponseTime: 0,
    },
    // Standalone equipments
    {
      id: uuid(), internalId: 'INFRA-DNS-001', name: 'Google DNS', host: '8.8.4.4',
      checkType: 'PING', location: 'Internet', groupName: 'Infraestrutura',
      checkInterval: 60, failThreshold: 5, alertCooldown: 600, status: 'ONLINE',
      monitoringEnabled: true, notes: 'DNS público Google secundário', uptimePercent: 99.99,
      lastCheck: now, lastOnline: now, avgResponseTime: 10.0,
    },
    {
      id: uuid(), internalId: 'INFRA-DNS-002', name: 'Cloudflare DNS', host: '1.0.0.1',
      checkType: 'PING', location: 'Internet', groupName: 'Infraestrutura',
      checkInterval: 60, failThreshold: 5, alertCooldown: 600, status: 'ONLINE',
      monitoringEnabled: true, notes: 'DNS público Cloudflare secundário', uptimePercent: 99.99,
      lastCheck: now, lastOnline: now, avgResponseTime: 8.0,
    },
  ];

  for (const eq of equipments) {
    await prisma.equipment.upsert({
      where: { internalId: eq.internalId },
      update: {},
      create: eq,
    });
  }

  // ---- Generate some historical checks ----
  const allEquipments = await prisma.equipment.findMany();
  const checksData = [];
  
  for (const eq of allEquipments) {
    // Generate 24 hours of historical checks (one per interval)
    const intervals = Math.min(50, Math.floor(86400 / eq.checkInterval));
    for (let i = intervals; i >= 0; i--) {
      const checkTime = new Date(now.getTime() - i * eq.checkInterval * 1000);
      const isSuccess = eq.status === 'MAINTENANCE' ? false : Math.random() > (eq.status === 'OFFLINE' ? 0.8 : eq.status === 'UNSTABLE' ? 0.2 : 0.02);
      const responseTime = isSuccess ? (eq.avgResponseTime * (0.5 + Math.random())) : null;
      
      checksData.push({
        id: uuid(),
        equipmentId: eq.id,
        success: isSuccess,
        responseTime,
        error: isSuccess ? null : 'Request timeout',
        previousStatus: eq.status,
        newStatus: eq.status,
        alertSent: false,
        checkedAt: checkTime,
      });
    }
  }

  // Batch insert checks
  const batchSize = 100;
  for (let i = 0; i < checksData.length; i += batchSize) {
    await prisma.equipmentCheck.createMany({
      data: checksData.slice(i, i + batchSize),
    });
  }

  // ---- Some sample alerts ----
  await prisma.alert.createMany({
    data: [
      {
        id: uuid(),
        equipmentId: allEquipments.find(e => e.internalId === 'TC-CAM-001')?.id || allEquipments[0].id,
        type: 'OFFLINE',
        channel: 'TELEGRAM',
        recipient: 'Admin Group',
        message: '🚨 ALERTA: Câmera Entrada Principal está OFFLINE\nIP: 192.168.10.50\nCliente: TechCorp Solutions\nFalhas consecutivas: 5',
        delivered: true,
        sentAt: new Date(now.getTime() - 3600000),
      },
      {
        id: uuid(),
        equipmentId: allEquipments.find(e => e.internalId === 'NL-ANT-002')?.id || allEquipments[1].id,
        type: 'UNSTABLE',
        channel: 'TELEGRAM',
        recipient: 'Tech Team',
        message: '⚠️ ALERTA: Antena Setor Norte está INSTÁVEL\nIP: 10.0.1.1\nCliente: NetLink Telecom\nResponding intermittently',
        delivered: true,
        sentAt: new Date(now.getTime() - 7200000),
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📧 Login credentials:');
  console.log('   Admin:   admin@pingalert.pro / admin123');
  console.log('   Técnico: carlos@pingalert.pro / tech123');
  console.log('   Cliente: joao@techcorp.com.br / client123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
