import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/prisma';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/notifications  — current user's notifications (latest 50)
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('[Notifications] GET / error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/notifications/:id/read  — mark one as read
// ---------------------------------------------------------------------------
router.put('/:id/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: String(req.params['id']), userId: req.user!.id },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('[Notifications] PUT /:id/read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/notifications/read-all  — mark all as read
// ---------------------------------------------------------------------------
router.put('/read-all', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: `Marked ${result.count} notification(s) as read` });
  } catch (err) {
    console.error('[Notifications] PUT /read-all error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
