import { io, Socket } from 'socket.io-client';
import { getMobileApiUrl } from '../api/mobileApiClient';

let socket: Socket | null = null;
let currentOrgId: string | null = null;
let currentBranchId: string | null = null;

export function getMobileSocket(): Socket {
  if (!socket) {
    const apiUrl = getMobileApiUrl();
    const origin = apiUrl.replace(/\/api\/v1\/?$/, '');
    socket = io(origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ Mobile Socket connected:', socket?.id);
      if (currentOrgId && currentBranchId) {
        joinMobileBranchRoom(currentOrgId, currentBranchId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Mobile Socket disconnected:', reason);
    });
  }
  return socket;
}

export function joinMobileBranchRoom(organizationId: string, branchId: string) {
  currentOrgId = organizationId;
  currentBranchId = branchId;
  const s = getMobileSocket();
  if (s.connected) {
    s.emit('join_branch', { organizationId, branchId });
  }
}

export function leaveMobileBranchRoom(organizationId: string, branchId: string) {
  const s = getMobileSocket();
  if (s.connected) {
    s.emit('leave_branch', { organizationId, branchId });
  }
}
