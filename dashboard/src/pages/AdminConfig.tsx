import * as React from 'react';
import { Settings, DollarSign, Map, Shield, Bell, Save, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AdminConfig = () => {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [success, setSuccess] = React.useState(false);

    // Fee Settings State
    const [baseFee, setBaseFee] = React.useState(1.5);
    const [perKmFee, setPerKmFee] = React.useState(0.4);
    const [serviceFee, setServiceFee] = React.useState(0.5);

    // Driver & Surge State
    const [driverBase, setDriverBase] = React.useState(1.2);
    const [driverPerKm, setDriverPerKm] = React.useState(0.3);
    const [surgeAmount, setSurgeAmount] = React.useState(0.0);
    const [driverBonus, setDriverBonus] = React.useState(0.0);

    React.useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'delivery_fee_config')
                .single();

            if (data?.value) {
                // Defensive mapping for both snake_case and CamelCase during migration period
                const v = data.value;
                setBaseFee(v.base_fee ?? v.baseFee ?? 1.5);
                setPerKmFee(v.per_km_fee ?? v.perKmFee ?? 0.4);
                setServiceFee(v.service_fee ?? v.serviceFee ?? 0.5);
                setDriverBase(v.driver_base ?? v.driverBase ?? 1.2);
                setDriverPerKm(v.driver_per_km ?? v.driverPerKm ?? 0.3);
                setSurgeAmount(v.surge_amount ?? v.surgeAmount ?? 0);
                setDriverBonus(v.driver_bonus ?? v.driverBonus ?? 0);
            }
            setLoading(false);
        };
        fetchSettings();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('system_settings_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'system_settings',
                    filter: "key=eq.delivery_fee_config"
                },
                (payload) => {
                    if (payload.new && payload.new.value) {
                        const v = payload.new.value as any;
                        if (!saving) {
                            setBaseFee(v.base_fee ?? v.baseFee ?? baseFee);
                            setPerKmFee(v.per_km_fee ?? v.perKmFee ?? perKmFee);
                            setServiceFee(v.service_fee ?? v.serviceFee ?? serviceFee);
                            setDriverBase(v.driver_base ?? v.driverBase ?? driverBase);
                            setDriverPerKm(v.driver_per_km ?? v.driverPerKm ?? driverPerKm);
                            setSurgeAmount(v.surge_amount ?? v.surgeAmount ?? surgeAmount);
                            setDriverBonus(v.driver_bonus ?? v.driverBonus ?? driverBonus);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('system_settings')
            .update({
                value: {
                    base_fee: baseFee,
                    per_km_fee: perKmFee,
                    service_fee: serviceFee,
                    driver_base: driverBase,
                    driver_per_km: driverPerKm,
                    surge_amount: surgeAmount,
                    driver_bonus: driverBonus
                }
            })
            .eq('key', 'delivery_fee_config');

        setSaving(false);
        if (error) {
            console.error('Error saving settings:', error);
            alert(`Failed to save settings: ${error.message}`);
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#FF4D00]" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">System Configuration</h1>
                    <p className="text-[#A3A3A3] text-sm">Global application settings and fee structures</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : success ? <CheckCircle size={18} /> : <Save size={18} />}
                    {saving ? 'Saving...' : success ? 'Settings Saved' : 'Save Changes'}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Delivery Fees */}
                <div className="glass p-8 space-y-6">
                    <h3 className="font-bold flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF4D00]/10 rounded-xl flex items-center justify-center text-[#FF4D00]">
                            <DollarSign size={20} />
                        </div>
                        Financials & Fees
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#A3A3A3] ml-1">Base Delivery Fee ($)</label>
                            <input
                                type="number"
                                value={baseFee}
                                onChange={(e) => setBaseFee(Number(e.target.value))}
                                step="0.5"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#A3A3A3] ml-1">Per KM Fee ($)</label>
                            <input
                                type="number"
                                value={perKmFee}
                                onChange={(e) => setPerKmFee(Number(e.target.value))}
                                step="0.1"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#A3A3A3] ml-1">Fixed Service Fee ($)</label>
                            <input
                                type="number"
                                value={serviceFee}
                                onChange={(e) => setServiceFee(Number(e.target.value))}
                                step="0.1"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Driver & Surge Controls */}
                <div className="glass p-8 space-y-6 border-l-4 border-accent">
                    <h3 className="font-bold flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                            <Shield size={20} />
                        </div>
                        Driver Pay & Surge
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-xs">
                            <label className="text-[#A3A3A3] ml-1">Driver Base ($)</label>
                            <input
                                type="number"
                                value={driverBase}
                                onChange={(e) => setDriverBase(Number(e.target.value))}
                                step="0.1"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div className="space-y-2 text-xs">
                            <label className="text-[#A3A3A3] ml-1">Driver Per KM ($)</label>
                            <input
                                type="number"
                                value={driverPerKm}
                                onChange={(e) => setDriverPerKm(Number(e.target.value))}
                                step="0.05"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div className="space-y-2 text-xs">
                            <label className="text-accent font-bold ml-1">Current Surge ($)</label>
                            <input
                                type="number"
                                value={surgeAmount}
                                onChange={(e) => setSurgeAmount(Number(e.target.value))}
                                step="0.5"
                                className="w-full bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div className="space-y-2 text-xs">
                            <label className="text-green-400 font-bold ml-1">Driver Bonus ($)</label>
                            <input
                                type="number"
                                value={driverBonus}
                                onChange={(e) => setDriverBonus(Number(e.target.value))}
                                step="0.1"
                                className="w-full bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Operations */}
                <div className="glass p-8 space-y-6 opacity-50 pointer-events-none">
                    <h3 className="font-bold flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                            <Map size={20} />
                        </div>
                        Operational Controls (Read Only)
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#A3A3A3] ml-1">Max Delivery Distance (KM)</label>
                            <input type="number" defaultValue={15} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" readOnly />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <div>
                                <p className="text-sm font-medium">Auto-dispatch Orders</p>
                                <p className="text-[10px] text-[#A3A3A3]">Assign nearest biker automatically</p>
                            </div>
                            <button className="w-12 h-6 bg-[#FF4D00] rounded-full relative">
                                <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
