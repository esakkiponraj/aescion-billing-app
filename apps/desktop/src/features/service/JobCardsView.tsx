import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Search, Smartphone, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { ServiceJobStatus } from '@aescion/shared-types';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const JobCardsView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Job state
  const [newJob, setNewJob] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    complaint: '',
    inspectionNotes: '',
    assetDetails: {
      assetType: 'Mobile',
      brand: 'Apple',
      model: 'iPhone 13',
      imeiNumber: '',
      conditionNotes: 'Minor scratches on bezel'
    },
    estimatedAmount: 4500,
    advancePaid: 1000
  });

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>('/service-jobs');
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [activeBranch?.id]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/service-jobs', newJob);
      setIsAddModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to create job card');
    }
  };

  const handleStatusUpdate = async (jobId: string, status: ServiceJobStatus) => {
    try {
      await ApiClient.put(`/service-jobs/${jobId}/status`, { status });
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to update job status');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-[#2563EB]" />
            <span>Service & Repair Job Cards</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Track customer assets, diagnoses, technician assignments, and parts billing.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Job Card</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-[#1D4ED8]">{job.jobNumber}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                  job.status === 'READY' || job.status === 'DELIVERED'
                    ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                    : job.status === 'IN_PROGRESS' || job.status === 'INSPECTION'
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                    : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="mt-2.5">
                <h4 className="text-xs font-bold text-[#0F172A]">{job.customerName}</h4>
                <div className="text-[11px] text-[#64748B]">{job.customerPhone}</div>
              </div>

              <div className="mt-2 p-2 bg-[#FAFBFC] rounded-md border border-[#EDF1F5] text-[11px] space-y-0.5">
                <div className="font-semibold text-[#0F172A] flex items-center space-x-1">
                  <Smartphone className="w-3 h-3 text-[#2563EB]" />
                  <span>{job.assetDetails?.brand} {job.assetDetails?.model}</span>
                </div>
                <div className="text-[#64748B]">Issue: {job.complaint}</div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#EDF1F5] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#64748B] block">Estimate</span>
                <span className="text-xs font-bold text-[#0F172A]">{formatCurrencyINR(job.estimatedAmount || 0)}</span>
              </div>

              <div className="flex items-center space-x-1">
                {job.status === ServiceJobStatus.RECEIVED && (
                  <button
                    onClick={() => handleStatusUpdate(job.id, ServiceJobStatus.IN_PROGRESS)}
                    className="px-2 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[10px] font-semibold rounded"
                  >
                    Start Repair
                  </button>
                )}
                {job.status === ServiceJobStatus.IN_PROGRESS && (
                  <button
                    onClick={() => handleStatusUpdate(job.id, ServiceJobStatus.READY)}
                    className="px-2 py-1 bg-[#10B981] hover:bg-[#059669] text-white text-[10px] font-semibold rounded"
                  >
                    Mark Ready
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE JOB MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Create Service Job Card</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newJob.customerName}
                    onChange={(e) => setNewJob({ ...newJob, customerName: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    value={newJob.customerPhone}
                    onChange={(e) => setNewJob({ ...newJob, customerPhone: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Asset Brand</label>
                  <input
                    type="text"
                    value={newJob.assetDetails.brand}
                    onChange={(e) => setNewJob({ ...newJob, assetDetails: { ...newJob.assetDetails, brand: e.target.value } })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Model / Serial</label>
                  <input
                    type="text"
                    value={newJob.assetDetails.model}
                    onChange={(e) => setNewJob({ ...newJob, assetDetails: { ...newJob.assetDetails, model: e.target.value } })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Reported Customer Complaint *</label>
                <textarea
                  required
                  rows={2}
                  value={newJob.complaint}
                  onChange={(e) => setNewJob({ ...newJob, complaint: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Estimated Repair (₹)</label>
                  <input
                    type="number"
                    value={newJob.estimatedAmount}
                    onChange={(e) => setNewJob({ ...newJob, estimatedAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Advance Received (₹)</label>
                  <input
                    type="number"
                    value={newJob.advancePaid}
                    onChange={(e) => setNewJob({ ...newJob, advancePaid: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Register Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
