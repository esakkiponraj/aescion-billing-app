import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
  }
  return socket;
}

export function joinBranchRoom(organizationId: string, branchId: string) {
  const s = getSocket();
  s.emit('joinBranchRoom', { organizationId, branchId });
}
