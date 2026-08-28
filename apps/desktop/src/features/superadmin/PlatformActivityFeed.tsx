import React, { useState, useEffect, useCallback } from 'react';
import { Layers, RefreshCw, Filter, Clock, Building2, User, Activity } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { getSocket } from '../../services/socket';

export const PlatformActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>('/super-admin/activity-feed?limit=50');
      setActivities(data || []);
    } catch (err) {
      console.warn('Failed to load platform activity feed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();

    const socket = getSocket();
    if (socket) {
      socket.emit('join_super_admin');
      socket.emit('join_platform');

      const handleLiveActivity = () => {
        fetchActivities();
      };

      socket.on('platform_activity_created', handleLiveActivity);
      socket.on('platform_invoice_created', handleLiveActivity);
      socket.on('platform_quotation_updated', handleLiveActivity);
      socket.on('platform_payment_created', handleLiveActivity);

      return () => {
        socket.off('platform_activity_created', handleLiveActivity);
        socket.off('platform_invoice_created', handleLiveActivity);
        socket.off('platform_quotation_updated', handleLiveActivity);
        socket.off('platform_payment_created', handleLiveActivity);
      };
    }
  }, [fetchActivities]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Live Multi-Tenant Activity Stream</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time chronological activity feed showing transactions, dispatches, payments, and master record edits across all companies
          </p>
        </div>

        <button
          onClick={() => {
            setIsRefreshing(true);
            fetchActivities();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs">Streaming platform activities...</div>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No platform activities recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((item) => (
              <div key={item.id} className="py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/80 px-3 rounded-xl transition">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-xs">{item.companyName}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                        {item.action}
                      </span>
                      {item.businessType && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                          {item.businessType}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      User: <strong>{item.userName}</strong> • Branch: <strong>{item.branchName || 'Main'}</strong> • Module: <strong>{item.entityType}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-[11px] font-mono text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
