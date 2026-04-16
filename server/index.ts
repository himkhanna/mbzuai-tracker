import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';


import authRoutes from './routes/auth';
import orderRoutes from './routes/orders';
import itemRoutes from './routes/items';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import notificationRoutes from './routes/notifications';
import auditRoutes from './routes/audit';
import settingsRoutes from './routes/settings';
import vendorSyncRoutes from './routes/vendorSync';
import importRoutes from './routes/import';
import { setupEmailIngestionCron } from './services/emailIngestionService';
import { triggerNotification } from './services/notificationService';
import { calculateItemStatus, calculateOrderStatus } from './utils/statusCalculator';
import prisma from './config/prisma';

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Security
app.use(helmet());

// CORS — allow the Vite dev client with credentials (cookies)
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (needed for httpOnly JWT cookie)
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/vendor-sync', vendorSyncRoutes);
app.use('/api/import', importRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Cron jobs
// ---------------------------------------------------------------------------

function setupCronJobs(): void {
  const tz = process.env.CRON_TIMEZONE || 'Asia/Dubai';

  // Daily 07:00 — Delivery Due Today
  cron.schedule(
    '0 7 * * *',
    async () => {
      console.log('[Cron] Running delivery-due-today scan…');
      try {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const items = await prisma.item.findMany({
          where: {
            expectedDeliveryDate: { gte: start, lte: end },
            receivedDate: null,
            status: { notIn: ['DELAYED', 'HANDED_OVER'] },
          },
          include: { order: true },
        });

        console.log(`[Cron] Found ${items.length} item(s) due today`);

        for (const item of items) {
          await triggerNotification(
            'DELIVERY_DUE',
            {
              reference: item.order.reference,
              description: item.description,
              vendor: item.order.vendor,
              expectedDate: item.expectedDeliveryDate!.toLocaleDateString('en-AE'),
              quantity: item.quantity,
              orderId: item.orderId,
              itemId: item.id,
              relatedId: item.id,
            },
            prisma,
          );
        }
      } catch (err) {
        console.error('[Cron] delivery-due-today error:', err);
      }
    },
    { timezone: tz },
  );

  // Daily 08:00 — Overdue Items
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('[Cron] Running overdue items scan…');
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items = await prisma.item.findMany({
          where: {
            expectedDeliveryDate: { lt: today },
            receivedDate: null,
            status: { notIn: ['HANDED_OVER', 'DELIVERED', 'STORED'] },
          },
          include: { order: true },
        });

        console.log(`[Cron] Found ${items.length} overdue item(s)`);

        for (const item of items) {
          const expected = new Date(item.expectedDeliveryDate!);
          expected.setHours(0, 0, 0, 0);
          const daysOverdue = Math.max(
            0,
            Math.floor((today.getTime() - expected.getTime()) / 86400000),
          );

          // Mark as DELAYED if not already
          if (item.status !== 'DELAYED') {
            await prisma.item.update({
              where: { id: item.id },
              data: { status: 'DELAYED' },
            });

            // Recalculate item status properly
            const freshItem = await prisma.item.findUnique({ where: { id: item.id } });
            if (freshItem) {
              const recalcStatus = calculateItemStatus(freshItem);
              // For truly overdue items, DELAYED takes precedence
              const finalStatus = recalcStatus === 'PENDING_DELIVERY'
                ? 'DELAYED'
                : recalcStatus;
              await prisma.item.update({ where: { id: item.id }, data: { status: finalStatus } });
            }
          }

          await triggerNotification(
            'DELIVERY_OVERDUE',
            {
              reference: item.order.reference,
              description: item.description,
              vendor: item.order.vendor,
              expectedDate: item.expectedDeliveryDate!.toLocaleDateString('en-AE'),
              daysOverdue,
              orderId: item.orderId,
              itemId: item.id,
              relatedId: item.id,
            },
            prisma,
          );
        }
      } catch (err) {
        console.error('[Cron] overdue-items error:', err);
      }
    },
    { timezone: tz },
  );

  console.log(`[Cron] Jobs scheduled (timezone: ${tz})`);
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function recalculateAllOrderStatuses(): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { isDeleted: false },
    select: { id: true },
  });
  for (const order of orders) {
    const items = await prisma.item.findMany({
      where: { orderId: order.id },
      select: { status: true },
    });
    const newStatus = calculateOrderStatus(items);
    await prisma.order.update({ where: { id: order.id }, data: { status: newStatus } });
  }
  console.log(`[Startup] Recalculated order statuses for ${orders.length} orders`);
}

async function main(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[DB] Connected to PostgreSQL via Prisma');

    await recalculateAllOrderStatuses();

    if (process.env.ENABLE_CRON_JOBS === 'true') {
      setupCronJobs();
    } else {
      console.log('[Cron] Cron jobs disabled (ENABLE_CRON_JOBS != true)');
    }

    setupEmailIngestionCron();

    app.listen(PORT, () => {
      console.log(`[Server] MBZUAI Tracker API running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] CORS origin: ${CLIENT_URL}`);
    });
  } catch (err) {
    console.error('[Server] Startup error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully…');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down…');
  await prisma.$disconnect();
  process.exit(0);
});

main();
