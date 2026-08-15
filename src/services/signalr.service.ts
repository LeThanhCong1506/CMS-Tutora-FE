/* eslint-disable @typescript-eslint/no-explicit-any */
import * as signalR from '@microsoft/signalr';
import { getCurrentUser } from './auth.service';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166';
const HUB_URL = `${API_BASE_URL}/hubs/chat`;
const NOTIFICATION_HUB_URL = `${API_BASE_URL}/notificationHub`;

// Debug log chỉ chạy ở local dev; production build (import.meta.env.DEV === false)
// sẽ tree-shake block này khỏi bundle để giữ console im lặng.
if (import.meta.env.DEV) {
  console.log('🔌 SignalR Config:');
  console.log('  - API_BASE_URL:', API_BASE_URL);
  console.log('  - Chat HUB_URL:', HUB_URL);
  console.log('  - Notification HUB_URL:', NOTIFICATION_HUB_URL);
}

class SignalRService {
  // Chat hub connection
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<void> | null = null;

  // Notification hub connection (riêng biệt)
  private notificationConnection: signalR.HubConnection | null = null;
  private notificationStartPromise: Promise<void> | null = null;

  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private notificationHandlers: Map<string, (data: any) => void> = new Map();

  // Multi-subscriber sets — cho các sidebar badge / global listener cần co-exist với
  // ChatArea (vốn dùng single-slot `onMessageReceived`). Khi message tới, cả handler
  // ở `messageHandlers` (ChatArea) lẫn mọi subscriber ở đây đều được gọi.
  private chatMessageSubscribers: Set<(message: any) => void> = new Set();
  private notificationSubscribers: Set<(notification: any) => void> = new Set();
  private disputeMessageSubscribers: Set<(message: any) => void> = new Set();
  private supportMessageSubscribers: Set<(message: any) => void> = new Set();

  // ==================== CONNECT / DISCONNECT ====================

  async connect(): Promise<void> {
    const user = getCurrentUser();
    const token = user?.accessToken || import.meta.env.VITE_TOKEN;

    if (!token) {
      console.error('❌ SignalR: No access token available');
      throw new Error('No access token available');
    }

    // Connect cả 2 hub song song
    await Promise.allSettled([
      this.connectChat(),
      this.connectNotification(),
    ]);
  }

  private async connectChat(): Promise<void> {
    if (this.startPromise) return this.startPromise;

    if (this.connection && (
      this.connection.state === signalR.HubConnectionState.Connected ||
      this.connection.state === signalR.HubConnectionState.Connecting ||
      this.connection.state === signalR.HubConnectionState.Reconnecting
    )) {
      console.log('✅ Chat SignalR: Already connected, state:', this.connection.state);
      return Promise.resolve();
    }

    console.log('🔗 Chat SignalR: Starting connection...');

    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => {
            const currentUser = getCurrentUser();
            return currentUser?.accessToken || import.meta.env.VITE_TOKEN || '';
          },
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.setupChatHandlers();
    }

    this.startPromise = this.connection.start()
      .then(() => {
        console.log('✅ Chat SignalR Connected', this.connection?.connectionId);
        this.startPromise = null;
      })
      .catch((err: any) => {
        this.startPromise = null;
        if (err.name === 'AbortError') {
          console.warn('⚠️ Chat SignalR aborted (common in React StrictMode)');
        } else {
          console.error('❌ Chat SignalR Connection failed:', err);
        }
        throw err;
      });

    return this.startPromise;
  }

  private async connectNotification(): Promise<void> {
    if (this.notificationStartPromise) return this.notificationStartPromise;

    if (this.notificationConnection && (
      this.notificationConnection.state === signalR.HubConnectionState.Connected ||
      this.notificationConnection.state === signalR.HubConnectionState.Connecting ||
      this.notificationConnection.state === signalR.HubConnectionState.Reconnecting
    )) {
      console.log('✅ Notification SignalR: Already connected');
      return Promise.resolve();
    }

    console.log('🔗 Notification SignalR: Starting connection...');

    if (!this.notificationConnection) {
      this.notificationConnection = new signalR.HubConnectionBuilder()
        .withUrl(NOTIFICATION_HUB_URL, {
          accessTokenFactory: () => {
            const currentUser = getCurrentUser();
            return currentUser?.accessToken || import.meta.env.VITE_TOKEN || '';
          },
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.setupNotificationHandlers();
    }

    this.notificationStartPromise = this.notificationConnection.start()
      .then(() => {
        console.log('✅ Notification SignalR Connected', this.notificationConnection?.connectionId);
        this.notificationStartPromise = null;
        // Re-register pending handlers after connect
        this.notificationHandlers.forEach((handler, eventName) => {
          this.notificationConnection?.off(eventName);
          this.notificationConnection?.on(eventName, handler);
        });
      })
      .catch((err: any) => {
        this.notificationStartPromise = null;
        if (err.name === 'AbortError') {
          console.warn('⚠️ Notification SignalR aborted (common in React StrictMode)');
        } else {
          console.error('❌ Notification SignalR Connection failed:', err);
        }
        // Don't rethrow - notification hub failure shouldn't break chat
      });

    return this.notificationStartPromise;
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.stop();
      console.log('🔌 Chat SignalR Disconnected');
      this.connection = null;
    }
    if (this.notificationConnection) {
      this.notificationConnection.stop();
      console.log('🔌 Notification SignalR Disconnected');
      this.notificationConnection = null;
    }
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  getState(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }

  // ==================== CHAT METHODS ====================

  async joinChannel(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ SignalR: Cannot join channel - connection not ready');
      throw new Error('SignalR connection not established');
    }
    try {
      await this.connection.invoke('JoinChannel', channelId);
      console.log(`✅ Joined channel ${channelId}`);
    } catch (err) {
      console.error(`❌ Error joining channel ${channelId}:`, err);
      throw err;
    }
  }

  async leaveChannel(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ SignalR: Cannot leave channel - connection not ready');
      throw new Error('SignalR connection not established');
    }
    try {
      await this.connection.invoke('LeaveChannel', channelId);
      console.log(`✅ Left channel ${channelId}`);
    } catch (err) {
      console.error(`❌ Error leaving channel ${channelId}:`, err);
      throw err;
    }
  }

  async sendMessage(channelId: number, content: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ SignalR: Cannot send message - connection not ready');
      throw new Error('SignalR connection not established');
    }
    try {
      await this.connection.invoke('SendMessage', channelId, content);
      console.log(`✅ Sent message to channel ${channelId}:`, content);
    } catch (err) {
      console.error('❌ Error sending message:', err);
      throw err;
    }
  }

  async typing(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    try {
      await this.connection.invoke('Typing', channelId);
    } catch (err) {
      console.error('❌ Error sending typing:', err);
    }
  }

  async stopTyping(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    try {
      await this.connection.invoke('StopTyping', channelId);
    } catch (err) {
      console.error('❌ Error sending stopTyping:', err);
    }
  }

  // ==================== NOTIFICATION METHODS ====================

  onNotificationReceived(handler: (notification: any) => void): void {
    this.notificationHandlers.set('ReceiveNotification', handler);
    if (this.notificationConnection) {
      this.notificationConnection.off('ReceiveNotification');
      this.notificationConnection.on('ReceiveNotification', handler);
    }
  }

  offNotificationReceived(): void {
    this.notificationHandlers.delete('ReceiveNotification');
    this.notificationConnection?.off('ReceiveNotification');
  }

  /**
   * Multi-subscriber API cho notifications — dùng khi page-level hook cần lắng nghe
   * notification cụ thể (vd. "Buổi học đã bắt đầu" để refresh lesson) mà không
   * clobber single-slot handler đang được Layout dùng cho global toast/badge.
   *
   * Trả về cleanup function — gọi để unsubscribe.
   */
  subscribeToNotifications(handler: (notification: any) => void): () => void {
    this.notificationSubscribers.add(handler);
    return () => { this.notificationSubscribers.delete(handler); };
  }

  /**
   * Multi-subscriber cho tin nhắn dispute-thread mới ("disputeMessageReceived") — dùng ở
   * trang chi tiết dispute để chèn tin nhắn trực tiếp vào state thay vì phải refetch.
   */
  subscribeToDisputeMessages(handler: (message: any) => void): () => void {
    this.disputeMessageSubscribers.add(handler);
    return () => { this.disputeMessageSubscribers.delete(handler); };
  }

  /**
   * Multi-subscriber cho tin nhắn hỗ trợ mới ("supportMessageReceived") — payload là
   * `SupportMessageBroadcast { userId, supportThreadId, message }`. Dùng ở trang Nhắn tin hỗ
   * trợ để chèn tin nhắn trực tiếp vào hội thoại đang mở, hoặc cập nhật preview/unread trong
   * danh sách khi hội thoại khác nhận tin.
   */
  subscribeToSupportMessages(handler: (message: any) => void): () => void {
    this.supportMessageSubscribers.add(handler);
    return () => { this.supportMessageSubscribers.delete(handler); };
  }

  onNotificationCountUpdated(handler: (count: number) => void): void {
    this.notificationHandlers.set('NotificationCountUpdated', handler);
    if (this.notificationConnection) {
      this.notificationConnection.off('NotificationCountUpdated');
      this.notificationConnection.on('NotificationCountUpdated', handler);
    }
  }

  offNotificationCountUpdated(): void {
    this.notificationHandlers.delete('NotificationCountUpdated');
    this.notificationConnection?.off('NotificationCountUpdated');
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    if (!this.notificationConnection || this.notificationConnection.state !== signalR.HubConnectionState.Connected) return;
    try {
      await this.notificationConnection.invoke('MarkNotificationAsRead', notificationId);
    } catch (err) {
      console.error('❌ Error marking notification as read via hub:', err);
    }
  }

  // ==================== CHAT EVENT LISTENERS ====================

  onMessageReceived(handler: (message: any) => void): void {
    this.addOrUpdateChatHandler('messageReceived', handler);
  }

  offMessageReceived(): void {
    this.removeChatHandler('messageReceived');
  }

  /**
   * Multi-subscriber API cho chat messages — dùng khi có ≥2 component cùng cần
   * lắng nghe message tới (vd. sidebar badge ở Layout + ChatArea ở page).
   *
   * Trả về cleanup function — gọi để unsubscribe. Khác với `onMessageReceived`
   * (single-slot, register thứ 2 ghi đè thứ 1), mỗi subscriber ở đây giữ nguyên
   * khi có subscriber khác đăng ký.
   */
  subscribeToChatMessages(handler: (message: any) => void): () => void {
    this.chatMessageSubscribers.add(handler);
    return () => { this.chatMessageSubscribers.delete(handler); };
  }

  onUserJoined(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userJoined', handler);
  }

  offUserJoined(): void {
    this.removeChatHandler('userJoined');
  }

  onUserLeft(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userLeft', handler);
  }

  offUserLeft(): void {
    this.removeChatHandler('userLeft');
  }

  onUserTyping(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userTyping', handler);
  }

  offUserTyping(): void {
    this.removeChatHandler('userTyping');
  }

  onUserStoppedTyping(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userStoppedTyping', handler);
  }

  offUserStoppedTyping(): void {
    this.removeChatHandler('userStoppedTyping');
  }

  // ==================== PRIVATE HELPERS ====================

  private addOrUpdateChatHandler(eventName: string, handler: (message: any) => void): void {
    this.messageHandlers.set(eventName, handler);
    if (this.connection) {
      this.connection.off(eventName);
      this.connection.on(eventName, handler);
    }
  }

  private removeChatHandler(eventName: string): void {
    this.messageHandlers.delete(eventName);
    if (this.connection) {
      this.connection.off(eventName);
    }
  }

  private setupChatHandlers(): void {
    if (!this.connection) return;

    this.connection.on('messageReceived', (message: any) => {
      console.log('📩 Chat messageReceived:', message);
      const handler = this.messageHandlers.get('messageReceived');
      if (handler) handler(message);
      // Notify multi-subscribers (sidebar badge, global toast, ...)
      this.chatMessageSubscribers.forEach((fn) => {
        try { fn(message); } catch (err) { console.error('chat subscriber failed:', err); }
      });
    });

    this.connection.on('userJoined', (data: any) => {
      console.log('👤 Chat userJoined:', data);
      const handler = this.messageHandlers.get('userJoined');
      if (handler) handler(data);
    });

    this.connection.on('userLeft', (data: any) => {
      console.log('👋 Chat userLeft:', data);
      const handler = this.messageHandlers.get('userLeft');
      if (handler) handler(data);
    });

    this.connection.on('userTyping', (data: any) => {
      const handler = this.messageHandlers.get('userTyping');
      if (handler) handler(data);
    });

    this.connection.on('userStoppedTyping', (data: any) => {
      const handler = this.messageHandlers.get('userStoppedTyping');
      if (handler) handler(data);
    });

    this.connection.onreconnecting((error?: Error) => {
      console.log('🔄 Chat SignalR Reconnecting...', error);
    });

    this.connection.onreconnected((connectionId?: string) => {
      console.log('✅ Chat SignalR Reconnected', connectionId);
    });

    this.connection.onclose((error?: Error) => {
      console.log('❌ Chat SignalR Closed', error);
    });
  }

  private setupNotificationHandlers(): void {
    if (!this.notificationConnection) return;

    this.notificationConnection.on('ReceiveNotification', (notification: any) => {
      console.log('🔔 Notification received:', notification);
      const handler = this.notificationHandlers.get('ReceiveNotification');
      if (handler) handler(notification);
      // Notify multi-subscribers (page-level lesson listener, ...)
      this.notificationSubscribers.forEach((fn) => {
        try { fn(notification); } catch (err) { console.error('notification subscriber failed:', err); }
      });
    });

    this.notificationConnection.on('disputeMessageReceived', (message: any) => {
      console.log('💬 Dispute message received:', message);
      this.disputeMessageSubscribers.forEach((fn) => {
        try { fn(message); } catch (err) { console.error('dispute message subscriber failed:', err); }
      });
    });

    this.notificationConnection.on('supportMessageReceived', (message: any) => {
      console.log('💬 Support message received:', message);
      this.supportMessageSubscribers.forEach((fn) => {
        try { fn(message); } catch (err) { console.error('support message subscriber failed:', err); }
      });
    });

    this.notificationConnection.on('NotificationCountUpdated', (count: number) => {
      console.log('📬 Notification count updated:', count);
      const handler = this.notificationHandlers.get('NotificationCountUpdated');
      if (handler) handler(count);
    });

    this.notificationConnection.on('NotificationMarkedAsRead', (notificationId: number) => {
      console.log('✅ Notification marked as read:', notificationId);
    });

    this.notificationConnection.onreconnecting((error?: Error) => {
      console.log('🔄 Notification SignalR Reconnecting...', error);
    });

    this.notificationConnection.onreconnected((connectionId?: string) => {
      console.log('✅ Notification SignalR Reconnected', connectionId);
      // Re-register handlers after reconnect
      this.notificationHandlers.forEach((handler, eventName) => {
        this.notificationConnection?.off(eventName);
        this.notificationConnection?.on(eventName, handler);
      });
    });

    this.notificationConnection.onclose((error?: Error) => {
      console.log('❌ Notification SignalR Closed', error);
    });
  }
}

// Export singleton instance
export const signalRService = new SignalRService();
