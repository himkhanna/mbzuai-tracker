import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Seeding database...');

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = [
    { name: 'Admin User',         email: 'admin@mbzuai.ac.ae',       password: 'Admin123!', role: 'ADMIN',             department: 'Administration' },
    { name: 'Vendor Manager',     email: 'vendor.mgmt@mbzuai.ac.ae', password: 'Pass123!',  role: 'VENDOR_MANAGEMENT', department: 'Procurement' },
    { name: 'Procurement Officer',email: 'procurement@mbzuai.ac.ae', password: 'Pass123!',  role: 'PROCUREMENT',       department: 'Procurement' },
    { name: 'Store Officer',      email: 'store@mbzuai.ac.ae',       password: 'Pass123!',  role: 'STORE',             department: 'Store' },
    { name: 'Finance Officer',    email: 'finance@mbzuai.ac.ae',     password: 'Pass123!',  role: 'FINANCE',           department: 'Finance' },
    { name: 'IT Officer',         email: 'it@mbzuai.ac.ae',          password: 'Pass123!',  role: 'IT',                department: 'IT' },
    { name: 'Asset Officer',      email: 'asset@mbzuai.ac.ae',       password: 'Pass123!',  role: 'ASSET',             department: 'Asset Management' },
  ];

  const createdUsers: any[] = [];
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, password: hashed, role: u.role, department: u.department },
    });
    createdUsers.push(user);
    console.log(`  ✓ User: ${u.email}`);
  }

  const adminUser = createdUsers[0];

  // ── Wipe existing transactional data ──────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.item.deleteMany();
  await prisma.order.deleteMany();
  console.log('  ✓ Cleared existing orders, items, audit logs, notifications');

  // ── Demo Orders ───────────────────────────────────────────────────────────
  // Reference format: PO-YYYY-NNN / DP-YYYY-NNN
  // End users: generic department / role labels — no real staff names

  const orders = [

    // 1. Fully completed order — shows the full lifecycle
    {
      type: 'PO', reference: 'PO-2025-001',
      vendor: 'Dell Technologies', supplier: 'Jumbo Electronics UAE',
      endUser: 'AI Research Lab', department: 'Research',
      orderDate: new Date('2025-10-01'), totalValue: 28500.0, currency: 'AED', status: 'COMPLETED',
      items: [
        {
          description: 'Dell Precision 5690 Workstation', itemCategory: 'Computer',
          quantity: 3, unitPrice: 7500.0, totalPrice: 22500.0,
          expectedDeliveryDate: new Date('2025-10-20'),
          receivedDate: new Date('2025-10-19'), storedDate: new Date('2025-10-19'),
          assetTaggingDate: new Date('2025-10-21'), itConfigDate: new Date('2025-10-23'),
          handoverDate: new Date('2025-10-25'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'HANDED_OVER',
        },
        {
          description: 'Dell 27" 4K Monitor U2723D', itemCategory: 'Display',
          quantity: 3, unitPrice: 2000.0, totalPrice: 6000.0,
          expectedDeliveryDate: new Date('2025-10-20'),
          receivedDate: new Date('2025-10-19'), storedDate: new Date('2025-10-19'),
          handoverDate: new Date('2025-10-25'),
          requiresAssetTagging: true, requiresITConfig: false, status: 'HANDED_OVER',
        },
      ],
    },

    // 2. Pending delivery — upcoming, not yet arrived
    {
      type: 'PO', reference: 'PO-2025-002',
      vendor: 'Cisco Systems',
      endUser: 'IT Infrastructure Team', department: 'IT',
      orderDate: new Date('2026-03-20'), totalValue: 68750.0, currency: 'AED', status: 'PENDING',
      items: [
        {
          description: 'Cisco Catalyst 9300 48-Port Switch', itemCategory: 'Networking',
          quantity: 2, unitPrice: 18500.0, totalPrice: 37000.0,
          expectedDeliveryDate: new Date('2026-04-20'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'PENDING_DELIVERY',
        },
        {
          description: 'Cisco ISR 4351 Router', itemCategory: 'Networking',
          quantity: 1, unitPrice: 22750.0, totalPrice: 22750.0,
          expectedDeliveryDate: new Date('2026-04-20'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'PENDING_DELIVERY',
        },
        {
          description: 'Cisco Wi-Fi 6E Access Point', itemCategory: 'Networking',
          quantity: 5, unitPrice: 1800.0, totalPrice: 9000.0,
          expectedDeliveryDate: new Date('2026-04-22'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'PENDING_DELIVERY',
        },
      ],
    },

    // 3. Received, waiting for asset tagging
    {
      type: 'DP', reference: 'DP-2025-001',
      vendor: 'Apple Inc.', supplier: 'Jumbo Electronics UAE',
      endUser: 'Machine Learning Lab', department: 'Research',
      orderDate: new Date('2026-02-15'), totalValue: 36500.0, currency: 'AED', status: 'IN_PROGRESS',
      items: [
        {
          description: 'Apple MacBook Pro M3 Max 16"', itemCategory: 'Laptop',
          quantity: 4, unitPrice: 8500.0, totalPrice: 34000.0,
          expectedDeliveryDate: new Date('2026-03-05'),
          receivedDate: new Date('2026-03-04'), storedDate: new Date('2026-03-04'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'PENDING_ASSET_TAGGING',
        },
        {
          description: 'Apple Magic Keyboard with Touch ID', itemCategory: 'Peripherals',
          quantity: 4, unitPrice: 625.0, totalPrice: 2500.0,
          expectedDeliveryDate: new Date('2026-03-05'),
          receivedDate: new Date('2026-03-04'), storedDate: new Date('2026-03-04'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'STORED',
        },
      ],
    },

    // 4. Asset tagged, waiting for IT config
    {
      type: 'DP', reference: 'DP-2025-002',
      vendor: 'NVIDIA Corporation',
      endUser: 'Computer Vision Lab', department: 'Research',
      orderDate: new Date('2026-02-20'), totalValue: 95600.0, currency: 'AED', status: 'IN_PROGRESS',
      items: [
        {
          description: 'NVIDIA DGX A100 80GB Server', itemCategory: 'Server',
          quantity: 1, unitPrice: 87000.0, totalPrice: 87000.0,
          expectedDeliveryDate: new Date('2026-03-15'),
          receivedDate: new Date('2026-03-14'), storedDate: new Date('2026-03-14'),
          assetTaggingDate: new Date('2026-03-16'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'PENDING_IT_CONFIG',
        },
        {
          description: 'Server Rack Cabinet 42U', itemCategory: 'Infrastructure',
          quantity: 1, unitPrice: 4800.0, totalPrice: 4800.0,
          expectedDeliveryDate: new Date('2026-03-15'),
          receivedDate: new Date('2026-03-14'), storedDate: new Date('2026-03-14'),
          assetTaggingDate: new Date('2026-03-16'),
          requiresAssetTagging: true, requiresITConfig: false, status: 'ASSET_TAGGED',
        },
        {
          description: '10GbE Network Switch 24-Port', itemCategory: 'Networking',
          quantity: 1, unitPrice: 3800.0, totalPrice: 3800.0,
          expectedDeliveryDate: new Date('2026-03-20'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'PENDING_DELIVERY',
        },
      ],
    },

    // 5. IT configured, ready for handover
    {
      type: 'PO', reference: 'PO-2025-003',
      vendor: 'Apple Inc.', supplier: 'iStyle UAE',
      endUser: 'Finance Department', department: 'Finance',
      orderDate: new Date('2026-02-01'), totalValue: 22000.0, currency: 'AED', status: 'IN_PROGRESS',
      items: [
        {
          description: 'iPhone 15 Pro 256GB', itemCategory: 'Mobile Device',
          quantity: 5, unitPrice: 4400.0, totalPrice: 22000.0,
          expectedDeliveryDate: new Date('2026-02-20'),
          receivedDate: new Date('2026-02-19'), storedDate: new Date('2026-02-19'),
          assetTaggingDate: new Date('2026-02-21'), itConfigDate: new Date('2026-02-24'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'IT_CONFIGURED',
        },
      ],
    },

    // 6. Delayed items — overdue
    {
      type: 'PO', reference: 'PO-2025-004',
      vendor: 'Lenovo',
      endUser: 'NLP Research Lab', department: 'Research',
      orderDate: new Date('2026-01-15'), totalValue: 18750.0, currency: 'AED', status: 'DELAYED',
      items: [
        {
          description: 'Lenovo ThinkPad X1 Carbon Gen 12', itemCategory: 'Laptop',
          quantity: 3, unitPrice: 6250.0, totalPrice: 18750.0,
          expectedDeliveryDate: new Date('2026-02-10'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'DELAYED',
        },
      ],
    },

    // 7. Mixed — some delayed, some in progress
    {
      type: 'DP', reference: 'DP-2025-003',
      vendor: 'Amazon Business',
      endUser: 'Robotics Lab', department: 'Research',
      orderDate: new Date('2026-01-20'), totalValue: 19200.0, currency: 'AED', status: 'DELAYED',
      items: [
        {
          description: 'NVIDIA RTX 4090 GPU', itemCategory: 'Computer Hardware',
          quantity: 1, unitPrice: 3200.0, totalPrice: 3200.0,
          expectedDeliveryDate: new Date('2026-02-15'),
          receivedDate: new Date('2026-02-17'), storedDate: new Date('2026-02-17'),
          requiresAssetTagging: true, requiresITConfig: false, status: 'PENDING_ASSET_TAGGING',
        },
        {
          description: 'Unitree Go2 Robot Dog', itemCategory: 'Robotics',
          quantity: 1, unitPrice: 14385.0, totalPrice: 14385.0,
          expectedDeliveryDate: new Date('2026-02-20'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'DELAYED',
        },
        {
          description: 'USB-C Hub 7-in-1', itemCategory: 'Accessories',
          quantity: 5, unitPrice: 123.0, totalPrice: 615.0,
          expectedDeliveryDate: new Date('2026-02-10'),
          receivedDate: new Date('2026-02-09'), storedDate: new Date('2026-02-09'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'STORED',
        },
      ],
    },

    // 8. Partially delivered — mixed statuses
    {
      type: 'DP', reference: 'DP-2025-004',
      vendor: 'B&H Photo Video',
      endUser: 'Media Lab', department: 'Research',
      orderDate: new Date('2026-03-01'), totalValue: 28900.0, currency: 'AED', status: 'IN_PROGRESS',
      items: [
        {
          description: 'Sony Alpha A7R V Camera Body', itemCategory: 'Camera',
          quantity: 2, unitPrice: 8250.0, totalPrice: 16500.0,
          expectedDeliveryDate: new Date('2026-03-20'),
          receivedDate: new Date('2026-03-20'), storedDate: new Date('2026-03-20'),
          requiresAssetTagging: true, requiresITConfig: false, status: 'PENDING_ASSET_TAGGING',
        },
        {
          description: 'Sony FE 24-70mm f/2.8 GM II Lens', itemCategory: 'Camera',
          quantity: 2, unitPrice: 5500.0, totalPrice: 11000.0,
          expectedDeliveryDate: new Date('2026-03-20'),
          receivedDate: new Date('2026-03-20'), storedDate: new Date('2026-03-20'),
          requiresAssetTagging: true, requiresITConfig: false, status: 'PENDING_ASSET_TAGGING',
        },
        {
          description: 'Manfrotto Pro Tripod Carbon Fiber', itemCategory: 'Camera Gear',
          quantity: 1, unitPrice: 1400.0, totalPrice: 1400.0,
          expectedDeliveryDate: new Date('2026-04-15'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
      ],
    },

    // 9. Accessories order — pending delivery soon
    {
      type: 'DP', reference: 'DP-2025-005',
      vendor: 'Amazon Business',
      endUser: 'General Procurement', department: 'Procurement',
      orderDate: new Date('2026-03-25'), totalValue: 4250.0, currency: 'AED', status: 'PENDING',
      items: [
        {
          description: 'Logitech MX Keys Advanced Keyboard', itemCategory: 'Peripherals',
          quantity: 5, unitPrice: 380.0, totalPrice: 1900.0,
          expectedDeliveryDate: new Date('2026-04-18'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
        {
          description: 'Logitech MX Master 3S Mouse', itemCategory: 'Peripherals',
          quantity: 5, unitPrice: 270.0, totalPrice: 1350.0,
          expectedDeliveryDate: new Date('2026-04-18'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
        {
          description: 'Portable SSD Samsung T7 1TB', itemCategory: 'Storage',
          quantity: 5, unitPrice: 200.0, totalPrice: 1000.0,
          expectedDeliveryDate: new Date('2026-04-20'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
      ],
    },

    // 10. Amazon vendor sync demo order
    {
      type: 'DP', reference: 'DP-2025-006',
      vendor: 'Amazon Business',
      endUser: 'AI Research Lab', department: 'Research',
      orderDate: new Date('2026-04-01'), totalValue: 12800.0, currency: 'AED', status: 'PENDING',
      vendorPlatform: 'amazon', vendorOrderId: '114-7654321-9876543',
      items: [
        {
          description: 'Apple MacBook Pro M3 14-inch', itemCategory: 'Laptop',
          quantity: 1, unitPrice: 8500.0, totalPrice: 8500.0,
          expectedDeliveryDate: new Date('2026-04-15'),
          requiresAssetTagging: true, requiresITConfig: true, status: 'PENDING_DELIVERY',
        },
        {
          description: 'Apple Magic Mouse', itemCategory: 'Peripherals',
          quantity: 1, unitPrice: 350.0, totalPrice: 350.0,
          expectedDeliveryDate: new Date('2026-04-15'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
        {
          description: 'USB-C to HDMI Adapter', itemCategory: 'Accessories',
          quantity: 2, unitPrice: 95.0, totalPrice: 190.0,
          expectedDeliveryDate: new Date('2026-04-12'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
      ],
    },

    // 11. Noon vendor sync demo order
    {
      type: 'DP', reference: 'DP-2025-007',
      vendor: 'Noon',
      endUser: 'Administration Office', department: 'Administration',
      orderDate: new Date('2026-04-02'), totalValue: 6300.0, currency: 'AED', status: 'PENDING',
      vendorPlatform: 'noon', vendorOrderId: 'NNN-987654321',
      items: [
        {
          description: 'Ergonomic Office Chair', itemCategory: 'Furniture',
          quantity: 6, unitPrice: 750.0, totalPrice: 4500.0,
          expectedDeliveryDate: new Date('2026-04-16'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
        {
          description: 'Standing Desk Mat Anti-Fatigue', itemCategory: 'Furniture',
          quantity: 6, unitPrice: 300.0, totalPrice: 1800.0,
          expectedDeliveryDate: new Date('2026-04-16'),
          requiresAssetTagging: false, requiresITConfig: false, status: 'PENDING_DELIVERY',
        },
      ],
    },

  ];

  for (const order of orders) {
    const { items, ...orderData } = order as any;
    const created = await prisma.order.create({
      data: {
        ...orderData,
        items: { create: items },
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'order', entityId: created.id, orderId: created.id,
        userId: adminUser.id, action: 'CREATED', timestamp: orderData.orderDate,
      },
    });

    console.log(`  ✓ Order: ${order.reference} (${order.type}) — ${items.length} item(s)`);
  }

  console.log('\n✅ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  admin@mbzuai.ac.ae         / Admin123!  (Admin)');
  console.log('  vendor.mgmt@mbzuai.ac.ae   / Pass123!   (Vendor Management)');
  console.log('  procurement@mbzuai.ac.ae   / Pass123!   (Procurement)');
  console.log('  store@mbzuai.ac.ae         / Pass123!   (Store)');
  console.log('  finance@mbzuai.ac.ae       / Pass123!   (Finance)');
  console.log('  it@mbzuai.ac.ae            / Pass123!   (IT)');
  console.log('  asset@mbzuai.ac.ae         / Pass123!   (Asset)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
