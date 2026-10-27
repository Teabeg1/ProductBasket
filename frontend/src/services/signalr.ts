import * as signalR from '@microsoft/signalr';
import { AuthService, API_BASE_URL } from './api';

const HUB_URL = API_BASE_URL.replace(/\/api\/?$/, '') + '/hubs/cart';

export interface ProductStatusChangedPayload {
  cartItemId: string;
  productId?: string;
  status: string;
  takenByUserId?: string;
  assignedToUserId?: string;
  takenByName?: string;
  isBought: boolean;
}

export interface CartUpdatedPayload {
  familyId: string;
  eventId?: string;
  timestamp?: string;
}

export interface FamilyUpdatedPayload {
  familyId: string;
  name: string;
}

export interface MemberJoinedPayload {
  familyId: string;
  member: any;
}

export interface MemberRemovedPayload {
  familyId: string;
  userId: string;
}

export interface MemberUpdatedPayload {
  familyId: string;
  userId: string;
  displayName: string;
}

export interface EventCreatedPayload {
  eventId: string;
  familyId: string;
  title: string;
}

export interface EventDeletedPayload {
  eventId: string;
  familyId: string;
}

export interface EventCompletedPayload {
  eventId: string;
  familyId: string;
  completedAt: string;
}

export interface EventCartCreatedPayload {
  eventId: string;
  familyId: string;
}

type ProductStatusCallback = (data: ProductStatusChangedPayload) => void;
type CartUpdatedCallback = (data: CartUpdatedPayload) => void;
type FamilyUpdatedCallback = (data: FamilyUpdatedPayload) => void;
type MemberJoinedCallback = (data: MemberJoinedPayload) => void;
type MemberRemovedCallback = (data: MemberRemovedPayload) => void;
type MemberUpdatedCallback = (data: MemberUpdatedPayload) => void;
type EventCreatedCallback = (data: EventCreatedPayload) => void;
type EventDeletedCallback = (data: EventDeletedPayload) => void;
type EventCompletedCallback = (data: EventCompletedPayload) => void;
type EventCartCreatedCallback = (data: EventCartCreatedPayload) => void;

class SignalRManager {
  private connection: signalR.HubConnection | null = null;
  private statusListeners: Set<ProductStatusCallback> = new Set();
  private cartUpdateListeners: Set<CartUpdatedCallback> = new Set();
  private familyUpdateListeners: Set<FamilyUpdatedCallback> = new Set();
  private memberJoinedListeners: Set<MemberJoinedCallback> = new Set();
  private memberRemovedListeners: Set<MemberRemovedCallback> = new Set();
  private memberUpdatedListeners: Set<MemberUpdatedCallback> = new Set();
  private eventCreatedListeners: Set<EventCreatedCallback> = new Set();
  private eventDeletedListeners: Set<EventDeletedCallback> = new Set();
  private eventCompletedListeners: Set<EventCompletedCallback> = new Set();
  private eventCartCreatedListeners: Set<EventCartCreatedCallback> = new Set();
  private isConnecting = false;

  async start(): Promise<signalR.HubConnection | null> {
    const token = await AuthService.getToken();
    if (!token) return null;

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return this.connection;
    }

    if (this.isConnecting) return null;
    this.isConnecting = true;

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: async () => {
            return (await AuthService.getToken()) || '';
          },
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging({
          log: (level: signalR.LogLevel, message: string) => {
            // LogBox in React Native displays any console.error as a fatal red screen.
            // WebSocket drops (e.g. 1006 / network sleep / software abort) are gracefully
            // handled by withAutomaticReconnect, so we prevent them from popping up red errors.
            if (level === signalR.LogLevel.Error) {
              if (
                message.includes('1006') ||
                message.includes('WebSocket') ||
                message.includes('transport') ||
                message.includes('abort') ||
                message.includes('stopped')
              ) {
                console.warn('[SignalR Network Info]', message);
                return;
              }
              console.warn('[SignalR Error]', message);
              return;
            }
            if (level === signalR.LogLevel.Warning) {
              console.warn('[SignalR Warning]', message);
            }
          },
        })
        .build();

      this.connection.on('ProductStatusChanged', (data: ProductStatusChangedPayload) => {
        this.statusListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in statusListener', e); }
        });
      });

      this.connection.on('CartUpdated', (data: CartUpdatedPayload) => {
        this.cartUpdateListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in cartUpdateListener', e); }
        });
      });

      this.connection.on('FamilyUpdated', (data: FamilyUpdatedPayload) => {
        this.familyUpdateListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in familyUpdateListener', e); }
        });
      });

      this.connection.on('MemberJoined', (data: MemberJoinedPayload) => {
        this.memberJoinedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in memberJoinedListener', e); }
        });
      });

      this.connection.on('MemberRemoved', (data: MemberRemovedPayload) => {
        this.memberRemovedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in memberRemovedListener', e); }
        });
      });

      this.connection.on('MemberLeft', (data: MemberRemovedPayload) => {
        this.memberRemovedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in memberLeftListener', e); }
        });
      });

      this.connection.on('MemberUpdated', (data: MemberUpdatedPayload) => {
        this.memberUpdatedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in memberUpdatedListener', e); }
        });
      });

      this.connection.on('EventCreated', (data: EventCreatedPayload) => {
        this.eventCreatedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in eventCreatedListener', e); }
        });
      });

      this.connection.on('EventDeleted', (data: EventDeletedPayload) => {
        this.eventDeletedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in eventDeletedListener', e); }
        });
      });

      this.connection.on('EventCompleted', (data: EventCompletedPayload) => {
        this.eventCompletedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in eventCompletedListener', e); }
        });
      });

      this.connection.on('EventCartCreated', (data: EventCartCreatedPayload) => {
        this.cartUpdateListeners.forEach((cb) => {
          try { cb({ familyId: data.familyId, eventId: data.eventId }); } catch (e) { console.warn('Error in eventCartCreated', e); }
        });
        this.eventCartCreatedListeners.forEach((cb) => {
          try { cb(data); } catch (e) { console.warn('Error in eventCartCreatedListener', e); }
        });
      });

      await this.connection.start();
      console.log('[SignalR] Connected successfully to CartHub');
      return this.connection;
    } catch (err) {
      console.warn('[SignalR] Connection start failed (will retry):', err);
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  async joinFamily(familyId: string) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinFamily', familyId);
      } catch (err) {
        console.warn('[SignalR] joinFamily failed:', err);
      }
    }
  }

  async assignProduct(cartItemId: string) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('AssignProduct', cartItemId);
      } catch (err) {
        console.warn('[SignalR] assignProduct failed:', err);
      }
    }
  }

  onProductStatusChanged(cb: ProductStatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  onCartUpdated(cb: CartUpdatedCallback): () => void {
    this.cartUpdateListeners.add(cb);
    return () => {
      this.cartUpdateListeners.delete(cb);
    };
  }

  onFamilyUpdated(cb: FamilyUpdatedCallback): () => void {
    this.familyUpdateListeners.add(cb);
    return () => {
      this.familyUpdateListeners.delete(cb);
    };
  }

  onMemberJoined(cb: MemberJoinedCallback): () => void {
    this.memberJoinedListeners.add(cb);
    return () => {
      this.memberJoinedListeners.delete(cb);
    };
  }

  onMemberRemoved(cb: MemberRemovedCallback): () => void {
    this.memberRemovedListeners.add(cb);
    return () => {
      this.memberRemovedListeners.delete(cb);
    };
  }

  onMemberUpdated(cb: MemberUpdatedCallback): () => void {
    this.memberUpdatedListeners.add(cb);
    return () => {
      this.memberUpdatedListeners.delete(cb);
    };
  }

  onEventCreated(cb: EventCreatedCallback): () => void {
    this.eventCreatedListeners.add(cb);
    return () => {
      this.eventCreatedListeners.delete(cb);
    };
  }

  onEventDeleted(cb: EventDeletedCallback): () => void {
    this.eventDeletedListeners.add(cb);
    return () => {
      this.eventDeletedListeners.delete(cb);
    };
  }

  onEventCompleted(cb: EventCompletedCallback): () => void {
    this.eventCompletedListeners.add(cb);
    return () => {
      this.eventCompletedListeners.delete(cb);
    };
  }

  onEventCartCreated(cb: EventCartCreatedCallback): () => void {
    this.eventCartCreatedListeners.add(cb);
    return () => {
      this.eventCartCreatedListeners.delete(cb);
    };
  }

  async stop() {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {}
      this.connection = null;
    }
  }
}

export const SignalRService = new SignalRManager();
