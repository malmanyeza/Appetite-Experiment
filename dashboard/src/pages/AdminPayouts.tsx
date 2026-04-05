import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../lib/services';
import { 
    DollarSign, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Search, 
    Filter,
    Wallet,
    ArrowUpRight,
    User,
    Phone,
    CreditCard
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const AdminPayouts = () => {
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processed' | 'rejected'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    const { data: payouts, isLoading } = useQuery({
        queryKey: ['admin-payouts'],
        queryFn: adminService.getPayoutRequests
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return adminService.updatePayoutStatus(id, status);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
        }
    });

    const filteredPayouts = payouts?.filter(p => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const driverName = p.profiles?.full_name?.toLowerCase() || '';
        const matchesSearch = driverName.includes(searchTerm.toLowerCase()) || 
                             p.driver_id.includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    const stats = (payouts || []).reduce((acc, p) => {
        if (p.status === 'pending') acc.pending += Number(p.amount);
        if (p.status === 'processed') acc.processed += Number(p.amount);
        return acc;
    }, { pending: 0, processed: 0 });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Payout Requests</h1>
                    <p className="text-muted text-sm mt-1">Review and process driver withdrawal requests</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search drivers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-[1.7]">
                        <Clock size={120} />
                    </div>
                    <div>
                        <p className="text-muted text-xs font-bold uppercase tracking-widest mb-1">Pending Payouts</p>
                        <h2 className="text-4xl font-black text-orange-400">
                            ${stats.pending.toFixed(2)}
                        </h2>
                        <div className="flex items-center gap-2 mt-4 text-xs font-bold text-muted">
                            <span className="bg-orange-400/10 text-orange-400 px-2.5 py-1 rounded-lg border border-orange-400/20">
                                {payouts?.filter(p => p.status === 'pending').length} Requests
                            </span>
                        </div>
                    </div>
                    <div className="w-14 h-14 bg-orange-400/10 rounded-2xl flex items-center justify-center border border-orange-400/20 transition-transform group-hover:rotate-6">
                        <Clock className="text-orange-400" size={28} />
                    </div>
                </div>

                <div className="glass p-6 rounded-2xl flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-[1.7]">
                        <CheckCircle2 size={120} />
                    </div>
                    <div>
                        <p className="text-muted text-xs font-bold uppercase tracking-widest mb-1">Total Paid Out</p>
                        <h2 className="text-4xl font-black text-green-400">
                            ${stats.processed.toFixed(2)}
                        </h2>
                        <div className="flex items-center gap-2 mt-4 text-xs font-bold text-muted">
                            <span className="bg-green-400/10 text-green-400 px-2.5 py-1 rounded-lg border border-green-500/20">
                                All-Time
                            </span>
                        </div>
                    </div>
                    <div className="w-14 h-14 bg-green-400/10 rounded-2xl flex items-center justify-center border border-green-500/20 transition-transform group-hover:rotate-6">
                        <CheckCircle2 className="text-green-500" size={28} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {(['all', 'pending', 'processed', 'rejected'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border shrink-0",
                            statusFilter === status 
                                ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" 
                                : "bg-white/5 border-white/10 text-muted hover:bg-white/10"
                        )}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Payouts Table */}
            <div className="glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-muted">Driver</th>
                                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-muted">Payment Details</th>
                                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-muted">Amount</th>
                                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-muted">Status</th>
                                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-muted">Date</th>
                                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-muted text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-muted italic">Fetching payout requests...</td></tr>
                            ) : filteredPayouts?.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-muted italic">No payout requests found.</td></tr>
                            ) : filteredPayouts?.map((payout) => (
                                <tr key={payout.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                                                <User className="text-accent" size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-base leading-tight">{payout.profiles?.full_name}</p>
                                                <p className="text-xs text-muted mt-0.5">{payout.profiles?.phone || 'No Phone'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <CreditCard size={14} className="text-muted" />
                                                <span className="text-sm font-medium text-white">
                                                    EcoCash: {payout.metadata?.ecocash_number || (Array.isArray(payout.profiles?.driver_profiles) ? payout.profiles.driver_profiles[0] : payout.profiles?.driver_profiles)?.ecocash_number || 'N/A'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted uppercase font-bold pl-5 leading-none">
                                                Name: {payout.metadata?.account_name || (Array.isArray(payout.profiles?.driver_profiles) ? payout.profiles.driver_profiles[0] : payout.profiles?.driver_profiles)?.account_name || 'Not provided'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-xs font-bold text-muted">$</span>
                                            <span className="text-lg font-black text-white">{Number(payout.amount).toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                            payout.status === 'pending' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                            payout.status === 'processed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                            "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}>
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                payout.status === 'pending' ? "bg-orange-400 animate-pulse" :
                                                payout.status === 'processed' ? "bg-green-500" :
                                                "bg-red-500"
                                            )} />
                                            {payout.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm text-white font-medium">
                                            {new Date(payout.created_at).toLocaleDateString()}
                                        </p>
                                        <p className="text-[10px] text-muted font-bold mt-0.5">
                                            {new Date(payout.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        {payout.status === 'pending' && (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ id: payout.id, status: 'rejected' })}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                                    title="Reject Request"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => updateStatusMutation.mutate({ id: payout.id, status: 'processed' })}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-green-500/0 hover:shadow-green-500/20"
                                                >
                                                    <CheckCircle2 size={16} /> Mark Paid
                                                </button>
                                            </div>
                                        )}
                                        {payout.status !== 'pending' && (
                                            <div className="flex items-center justify-end">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center opacity-30">
                                                    <ArrowUpRight size={18} className="text-muted" />
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
