export interface AppNotification {
  id: string;
  roomId: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  room: { id: string; name: string };
}
