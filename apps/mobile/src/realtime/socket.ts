import { io, Socket } from 'socket.io-client';
import { getMobileApiUrl } from '../api/mobileApiClient';

let socket: Socket | null = null;
let currentAuthPayload: {
  userId: string;
  organizationId: string;
  branchId?: string;
  roleType?: string;
} | null = null;
let heartbeatInterval: any = null;

export function getMobileSocket(): Socket {
  if (!socket) {
    const apiUrl = getMobileApiUrl();
    const origin = apiUrl.replace(/\/api\/v1\/?$/, '');
    socket = io(origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ Mobile Socket connected:', socket?.id);
      if (currentAuthPayload) {
        emitMobilePresenceIdentification(socket!, currentAuthPayload);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Mobile Socket disconnected:', reason);
    });

    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit('heartbeat');
        }
      }, 25000);
    }
  }
  return socket;
}

function emitMobilePresenceIdentification(s: Socket, auth: typeof currentAuthPayload) {
  if (!auth) return;
  s.emit('identify_presence', {
    userId: auth.userId,
    organizationId: auth.organizationId,
    branchId: auth.branchId,
    roleType: auth.roleType,
    platform: 'mobile'
  });
  s.emit('join_branch', { organizationId: auth.organizationId, branchId: auth.branchId });
  s.emit('joinBranchRoom', { organizationId: auth.organizationId, branchId: auth.branchId });
  s.emit('join_org', { organizationId: auth.organizationId });
  if (auth.roleType === 'SUPER_ADMIN') {
    s.emit('join_super_admin');
  }
}

export function identifyMobilePresence(userId: string, organizationId: string, branchId?: string, roleType?: string) {
  currentAuthPayload = { userId, organizationId, branchId, roleType };
  const s = getMobileSocket();
  if (s.connected) {
    emitMobilePresenceIdentification(s, currentAuthPayload);
  }
}

export function disconnectMobilePresence() {
  currentAuthPayload = null;
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function joinMobileBranchRoom(organizationId: string, branchId?: string) {
  if (currentAuthPayload) {
    currentAuthPayload.organizationId = organizationId;
    currentAuthPayload.branchId = branchId;
  }
  const s = getMobileSocket();
  if (s.connected) {
    s.emit('join_branch', { organizationId, branchId });
    s.emit('joinBranchRoom', { organizationId, branchId });
    s.emit('join_org', { organizationId });
  }
}

export function leaveMobileBranchRoom(organizationId: string, branchId: string) {
  const s = getMobileSocket();
  if (s.connected) {
    s.emit('leave_branch', { organizationId, branchId });
  }
}

export function subscribeToRealtimeEvent(eventName: string, callback: (data: any) => void): () => void {
  const s = getMobileSocket();
  s.on(eventName, callback);
  return () => {
    s.off(eventName, callback);
  };
}

export function reconnectMobileSocket() {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
  } else {
    getMobileSocket();
  }
}
