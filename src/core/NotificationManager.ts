/**
 * NotificationManager - Handles temporary messages and notifications
 * Extracted from main.ts to centralize user notification handling
 */

export interface NotificationOptions {
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
  position?: 'center' | 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  icon?: string;
}

export class NotificationManager {
  private activeNotifications: Map<string, HTMLElement> = new Map();
  private notificationCounter = 0;

  constructor() {
    this.setupStyles();
  }

  private setupStyles() {
    // Inject CSS styles for notifications if not already present
    if (!document.getElementById('notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        .notification {
          position: fixed;
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #00ff88;
          border-radius: 8px;
          padding: 15px 25px;
          color: #00ff88;
          font-family: 'Courier New', monospace;
          z-index: 3000;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
          transition: all 0.3s ease;
          transform: translateY(0);
          opacity: 1;
        }

        .notification.success {
          border-color: #00ff88;
          color: #00ff88;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }

        .notification.error {
          border-color: #ff0088;
          color: #ff0088;
          box-shadow: 0 0 20px rgba(255, 0, 136, 0.3);
        }

        .notification.warning {
          border-color: #ffaa00;
          color: #ffaa00;
          box-shadow: 0 0 20px rgba(255, 170, 0, 0.3);
        }

        .notification.info {
          border-color: #4488ff;
          color: #4488ff;
          box-shadow: 0 0 20px rgba(68, 136, 255, 0.3);
        }

        .notification.center {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .notification.top-right {
          top: 20px;
          right: 20px;
        }

        .notification.bottom-right {
          bottom: 20px;
          right: 20px;
        }

        .notification.top-left {
          top: 20px;
          left: 20px;
        }

        .notification.bottom-left {
          bottom: 20px;
          left: 20px;
        }

        .notification.hiding {
          opacity: 0;
          transform: translateY(-20px);
        }

        .notification.center.hiding {
          transform: translate(-50%, -70%);
        }

        .notification-icon {
          margin-right: 8px;
          font-size: 1.2em;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  show(message: string, options: NotificationOptions = {}): string {
    const { duration = 2000, type = 'info', position = 'center', icon } = options;

    const notificationId = `notification-${++this.notificationCounter}`;

    // Create notification element
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `notification ${type} ${position}`;

    // Add icon if provided
    const iconElement = icon ? `<span class="notification-icon">${icon}</span>` : '';
    notification.innerHTML = `${iconElement}${message}`;

    // Position multiple notifications
    this.positionNotification(notification, position);

    document.body.appendChild(notification);
    this.activeNotifications.set(notificationId, notification);

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        this.hide(notificationId);
      }, duration);
    }

    return notificationId;
  }

  private positionNotification(notification: HTMLElement, position: string) {
    // For stacked notifications in the same position
    const existingNotifications = Array.from(this.activeNotifications.values()).filter(n =>
      n.classList.contains(position)
    );

    if (existingNotifications.length > 0 && position !== 'center') {
      const offset = existingNotifications.length * 80; // 80px spacing between notifications

      switch (position) {
        case 'top-right':
          notification.style.top = `${20 + offset}px`;
          break;
        case 'bottom-right':
          notification.style.bottom = `${20 + offset}px`;
          break;
        case 'top-left':
          notification.style.top = `${20 + offset}px`;
          break;
        case 'bottom-left':
          notification.style.bottom = `${20 + offset}px`;
          break;
      }
    }
  }

  hide(notificationId: string): void {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;

    // Add hiding animation
    notification.classList.add('hiding');

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.activeNotifications.delete(notificationId);
    }, 300); // Wait for animation to complete
  }

  hideAll(): void {
    const ids = Array.from(this.activeNotifications.keys());
    ids.forEach(id => this.hide(id));
  }

  // Convenience methods for different notification types
  success(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.show(message, { ...options, type: 'success', icon: options.icon || '✅' });
  }

  error(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.show(message, { ...options, type: 'error', icon: options.icon || '❌' });
  }

  warning(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.show(message, { ...options, type: 'warning', icon: options.icon || '⚠️' });
  }

  info(message: string, options: Omit<NotificationOptions, 'type'> = {}): string {
    return this.show(message, { ...options, type: 'info', icon: options.icon || 'ℹ️' });
  }

  // Special method for temporary status messages (legacy compatibility)
  showTemporaryMessage(message: string, duration = 2000): string {
    return this.show(message, {
      duration,
      type: 'info',
      position: 'center',
    });
  }

  getActiveNotifications(): string[] {
    return Array.from(this.activeNotifications.keys());
  }

  getNotificationCount(): number {
    return this.activeNotifications.size;
  }
}

// Singleton instance
let notificationManager: NotificationManager | null = null;

export function createNotificationManager(): NotificationManager {
  if (notificationManager) {
    throw new Error(
      'NotificationManager instance already exists. Use getNotificationManager() instead.'
    );
  }
  notificationManager = new NotificationManager();
  return notificationManager;
}

export function getNotificationManager(): NotificationManager {
  if (!notificationManager) {
    throw new Error('NotificationManager not initialized. Call createNotificationManager() first.');
  }
  return notificationManager;
}
