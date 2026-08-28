import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface ClientSessionInfo {
  socketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  companyName: string;
  businessType: string;
  roleType: string;
  branchId?: string;
  branchName?: string;
  platform: 'desktop' | 'mobile';
  connectedAt: Date;
  lastSeen: Date;
}

export interface OnlineOwnerSummary {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  companyName: string;
  businessType: string;
  roleType: string;
  branchId?: string;
  branchName?: string;
  status: 'ONLINE' | 'RECENTLY_ACTIVE' | 'OFFLINE';
  platform: 'desktop' | 'mobile' | 'both';
  sessionsCount: number;
  desktopSessions: number;
  mobileSessions: number;
  connectedSince: Date;
  lastSeen: Date;
  sessions: {
    socketId: string;
    platform: 'desktop' | 'mobile';
    connectedAt: Date;
    lastSeen: Date;
    branchName?: string;
  }[];
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger('PresenceService');

  // Map: socketId -> Session details
  private readonly sessions = new Map<string, ClientSessionInfo>();

  // Map: userId -> Set of active socketIds
  private readonly userSessions = new Map<string, Set<string>>();

  // Cache: userId -> Last seen timestamp & metadata
  private readonly lastSeenMap = new Map<string, { lastSeen: Date; platform: 'desktop' | 'mobile' | 'both'; companyName: string }>();

  constructor(private prisma: PrismaService) {}

  /**
   * Register or update an authenticated client socket session
   */
  registerSession(session: ClientSessionInfo): { onlineOwnersCount: number; activeSessionsCount: number } {
    this.sessions.set(session.socketId, session);

    if (!this.userSessions.has(session.userId)) {
      this.userSessions.set(session.userId, new Set());
    }
    this.userSessions.get(session.userId)!.add(session.socketId);

    this.lastSeenMap.set(session.userId, {
      lastSeen: session.lastSeen,
      platform: session.platform,
      companyName: session.companyName
    });

    this.logger.log(
      `[Presence] Registered ${session.roleType} ${session.userName} (${session.companyName}) on ${session.platform} [Socket: ${session.socketId}]`
    );

    return this.getPresenceSnapshot();
  }

  /**
   * Remove socket session upon disconnect
   */
  removeSession(socketId: string): {
    disconnectedSession?: ClientSessionInfo;
    isUserCompletelyOffline: boolean;
    remainingSessionsCount: number;
    snapshot: { onlineOwnersCount: number; activeSessionsCount: number };
  } {
    const session = this.sessions.get(socketId);
    if (!session) {
      return {
        isUserCompletelyOffline: false,
        remainingSessionsCount: 0,
        snapshot: this.getPresenceSnapshot()
      };
    }

    this.sessions.delete(socketId);

    const userSockets = this.userSessions.get(session.userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    const remainingSessionsCount = this.userSessions.get(session.userId)?.size || 0;
    const isUserCompletelyOffline = remainingSessionsCount === 0;

    this.lastSeenMap.set(session.userId, {
      lastSeen: new Date(),
      platform: session.platform,
      companyName: session.companyName
    });

    this.logger.log(
      `[Presence] Disconnected ${session.userName} (${session.platform}). Remaining sessions for user: ${remainingSessionsCount}`
    );

    return {
      disconnectedSession: session,
      isUserCompletelyOffline,
      remainingSessionsCount,
      snapshot: this.getPresenceSnapshot()
    };
  }

  /**
   * Heartbeat touch to keep session alive
   */
  touchHeartbeat(socketId: string) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.lastSeen = new Date();
      this.lastSeenMap.set(session.userId, {
        lastSeen: session.lastSeen,
        platform: session.platform,
        companyName: session.companyName
      });
    }
  }

  /**
   * Authoritative list of active online Owners (grouped by unique user)
   */
  getOnlineOwners(): OnlineOwnerSummary[] {
    const ownerMap = new Map<string, OnlineOwnerSummary>();

    for (const session of this.sessions.values()) {
      if (session.roleType !== 'OWNER') {
        continue;
      }

      if (!ownerMap.has(session.userId)) {
        ownerMap.set(session.userId, {
          userId: session.userId,
          userName: session.userName,
          userEmail: session.userEmail,
          organizationId: session.organizationId,
          companyName: session.companyName,
          businessType: session.businessType,
          roleType: session.roleType,
          branchId: session.branchId,
          branchName: session.branchName,
          status: 'ONLINE',
          platform: session.platform,
          sessionsCount: 0,
          desktopSessions: 0,
          mobileSessions: 0,
          connectedSince: session.connectedAt,
          lastSeen: session.lastSeen,
          sessions: []
        });
      }

      const summary = ownerMap.get(session.userId)!;
      summary.sessionsCount += 1;
      if (session.platform === 'desktop') summary.desktopSessions += 1;
      if (session.platform === 'mobile') summary.mobileSessions += 1;

      if (summary.desktopSessions > 0 && summary.mobileSessions > 0) {
        summary.platform = 'both';
      } else if (summary.desktopSessions > 0) {
        summary.platform = 'desktop';
      } else {
        summary.platform = 'mobile';
      }

      if (session.connectedAt < summary.connectedSince) {
        summary.connectedSince = session.connectedAt;
      }
      if (session.lastSeen > summary.lastSeen) {
        summary.lastSeen = session.lastSeen;
      }

      summary.sessions.push({
        socketId: session.socketId,
        platform: session.platform,
        connectedAt: session.connectedAt,
        lastSeen: session.lastSeen,
        branchName: session.branchName
      });
    }

    return Array.from(ownerMap.values()).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  /**
   * Active sessions for a specific company (safe view for tenant drilldown)
   */
  getCompanySessions(organizationId: string): {
    status: 'ONLINE' | 'OFFLINE';
    activeSessionsCount: number;
    sessions: {
      platform: 'desktop' | 'mobile';
      userName: string;
      roleType: string;
      branchName?: string;
      connectedAt: Date;
      lastSeen: Date;
    }[];
    lastSeen?: Date;
  } {
    const orgSessions: ClientSessionInfo[] = [];
    for (const session of this.sessions.values()) {
      if (session.organizationId === organizationId) {
        orgSessions.push(session);
      }
    }

    const isOnline = orgSessions.length > 0;

    return {
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      activeSessionsCount: orgSessions.length,
      sessions: orgSessions.map((s) => ({
        platform: s.platform,
        userName: s.userName,
        roleType: s.roleType,
        branchName: s.branchName,
        connectedAt: s.connectedAt,
        lastSeen: s.lastSeen
      }))
    };
  }

  /**
   * High-level presence counts snapshot strictly for Owners
   */
  getPresenceSnapshot() {
    const onlineOwners = this.getOnlineOwners();
    let desktopSessionsCount = 0;
    let mobileSessionsCount = 0;

    for (const session of this.sessions.values()) {
      if (session.roleType === 'OWNER') {
        if (session.platform === 'desktop') desktopSessionsCount++;
        if (session.platform === 'mobile') mobileSessionsCount++;
      }
    }

    return {
      onlineOwnersCount: onlineOwners.length,
      activeSessionsCount: desktopSessionsCount + mobileSessionsCount,
      desktopSessionsCount,
      mobileSessionsCount
    };
  }

  /**
   * Last seen timestamp for a specific user ID
   */
  getLastSeenForUser(userId: string): Date | null {
    return this.lastSeenMap.get(userId)?.lastSeen || null;
  }
}
