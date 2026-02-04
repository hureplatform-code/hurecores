// Notification Service - Firebase/Firestore Implementation
import {
    collections,
    docs,
    addDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from '../firestore';
import { emailService } from './email.service';

export interface NotificationData {
    userId: string;
    organizationId: string;
    type: 'staff_joined' | 'leave_request' | 'schedule_update' | 'shift_assigned' | 'system';
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: any;
}

export const notificationService = {
    /**
     * Create a notification for a specific user
     */
    async createNotification(
        userId: string,
        organizationId: string,
        type: NotificationData['type'],
        title: string,
        message: string,
        link?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            await addDoc(collections.notifications(organizationId), {
                userId,
                organizationId,
                type,
                title,
                message,
                link,
                read: false,
                createdAt: serverTimestamp()
            });
            return { success: true };
        } catch (error: any) {
            console.error('Create notification error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Notify organization admins when a new staff member joins
     */
    async notifyStaffJoined(
        organizationId: string,
        staffName: string,
        staffRole: string,
        adminUserIds: string[]
    ): Promise<void> {
        const title = '👋 New Staff Member Joined';
        const message = `${staffName} has accepted their invitation and joined as ${staffRole}.`;
        const link = '/#/employer/staff';

        // Create notification for each admin
        for (const adminId of adminUserIds) {
            await this.createNotification(
                adminId,
                organizationId,
                'staff_joined',
                title,
                message,
                link
            );
        }
    },

    /**
     * Get notifications for a user
     */
    async getUserNotifications(organizationId: string, userId: string): Promise<NotificationData[]> {
        try {
            const q = query(
                collections.notifications(organizationId),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationData & { id: string }));
        } catch (error) {
            console.error('Get notifications error:', error);
            return [];
        }
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount(organizationId: string, userId: string): Promise<number> {
        try {
            const q = query(
                collections.notifications(organizationId),
                where('userId', '==', userId),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Get unread count error:', error);
            return 0;
        }
    },

    /**
     * Mark notification as read
     */
    async markAsRead(organizationId: string, notificationId: string): Promise<void> {
        try {
            await updateDoc(docs.notification(organizationId, notificationId), {
                read: true
            });
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    },

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(organizationId: string, userId: string): Promise<void> {
        try {
            const notifications = await this.getUserNotifications(organizationId, userId);
            for (const notif of notifications) {
                if (!(notif as any).read) {
                    await this.markAsRead(organizationId, (notif as any).id);
                }
            }
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    }
};
