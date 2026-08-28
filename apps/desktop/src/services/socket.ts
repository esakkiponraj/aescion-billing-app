import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentAuthPayload: {
  userId: string;
  organizationId: string;
  branchId?: string;
  roleType?: string;
} | null = null;
let heartbeatInterval: any = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      if (currentAuthPayload) {
        emitPresenceIdentification(socket!, currentAuthPayload);
      }
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

function emitPresenceIdentification(s: Socket, auth: typeof currentAuthPayload) {
  if (!auth) return;
  s.emit('identify_presence', {
    userId: auth.userId,
    organizationId: auth.organizationId,
    branchId: auth.branchId,
    roleType: auth.roleType,
    platform: 'desktop'
  });
  s.emit('joinBranchRoom', { organizationId: auth.organizationId, branchId: auth.branchId });
  s.emit('join_org', { organizationId: auth.organizationId });
  if (auth.roleType === 'SUPER_ADMIN') {
    s.emit('join_super_admin');
  }
}

export function identifyPresence(userId: string, organizationId: string, branchId?: string, roleType?: string) {
  currentAuthPayload = { userId, organizationId, branchId, roleType };
  const s = getSocket();
  if (s.connected) {
    emitPresenceIdentification(s, currentAuthPayload);
  }
}

export function disconnectPresence() {
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

export function joinBranchRoom(organizationId: string, branchId?: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('joinBranchRoom', { organizationId, branchId });
    s.emit('join_branch', { organizationId, branchId });
    s.emit('join_org', { organizationId });
  } else {
    s.once('connect', () => {
      s.emit('joinBranchRoom', { organizationId, branchId });
      s.emit('join_branch', { organizationId, branchId });
      s.emit('join_org', { organizationId });
    });
  }
}

export function subscribeToRealtime(eventName: string, callback: (data: any) => void): () => void {
  const s = getSocket();
  s.on(eventName, callback);
  return () => {
    s.off(eventName, callback);
  };
}
