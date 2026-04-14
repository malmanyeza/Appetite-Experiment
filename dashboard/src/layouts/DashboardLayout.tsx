import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { restaurantService } from '../lib/services';
import {
    LayoutDashboard,
    Utensils,
    Bike,
    Settings,
    LogOut,
    ChevronRight,
    Search,
    Bell,
    User,
    Navigation,
    Menu,
    X,
    Wallet,
    Volume2,
    VolumeX
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const SidebarLink = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
    <Link
        to={to}
        className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
            active ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted hover:bg-white/5 hover:text-white"
        )}
    >
        <Icon size={20} className={cn(active ? "" : "group-hover:scale-110 transition-transform")} />
        <span className="font-medium">{label}</span>
        {active && <ChevronRight size={16} className="ml-auto" />}
    </Link>
);

const AudioActivationOverlay = ({ onActivate }: { onActivate: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/40 backdrop-blur-2xl animate-in fade-in duration-700">
        <div className="max-w-md w-full bg-surface/80 border border-white/10 p-10 rounded-[32px] shadow-2xl text-center space-y-8 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 delay-200">
            <div className="w-24 h-24 bg-accent/20 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                <Volume2 size={48} className="text-accent" />
            </div>
            
            <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">System Ready</h2>
                <p className="text-muted text-lg leading-relaxed">
                    Activate the monitoring system to enable real-time notification alerts.
                </p>
            </div>

            <button
                onClick={onActivate}
                className="w-full bg-accent hover:bg-accent-light text-white font-bold py-5 px-8 rounded-2xl shadow-xl shadow-accent/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 text-xl group"
            >
                Start Monitoring
                <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
            
            <p className="text-muted-foreground text-sm font-medium">
                Unlocks audio context for this session
            </p>
        </div>
    </div>
);

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
    const { currentRole, profile, signOut, roles, switchRole } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const queryClient = useQueryClient();

    const [notifications, setNotifications] = useState<{ id: string, message: string }[]>([]);
    const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
        return localStorage.getItem('dashboard-audio-enabled') === 'true';
    });

    const sounds = {
        ORDER: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        DRIVER: 'https://assets.mixkit.co/active_storage/sfx/2215/2215-preview.mp3',
        PAYOUT: 'https://assets.mixkit.co/active_storage/sfx/2212/2212-preview.mp3'
    };

    const audioRefs = React.useRef<Record<string, HTMLAudioElement>>({});
    const [isPrimed, setIsPrimed] = useState(false);
    const [isAudioBlocked, setIsAudioBlocked] = useState(false);

    useEffect(() => {
        // Pre-load audio elements
        Object.entries(sounds).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            audio.volume = 1.0;
            audioRefs.current[key] = audio;
        });
        console.log('[Audio] Persistent audio elements initialized');
    }, []);

    const playAlert = (type: keyof typeof sounds) => {
        if (!isAudioEnabled) {
            console.log(`[Audio] Sound ${type} skipped (Audio Disabled)`);
            return;
        }

        const audio = audioRefs.current[type];
        if (audio) {
            console.log(`[Audio] Attempting to play ${type} alert...`);
            audio.currentTime = 0; // Restart from beginning
            audio.play()
                .then(() => {
                    console.log(`[Audio] ${type} play successful`);
                    setIsPrimed(true);
                    setIsAudioBlocked(false);
                })
                .catch(e => {
                    console.warn(`[Audio] ${type} play failed:`, e.message);
                    if (e.name === 'NotAllowedError') {
                        console.error('[Audio] Browser blocked autoplay. Please click the Speaker icon again.');
                        setIsAudioBlocked(true);
                    }
                });
        } else {
            console.error(`[Audio] Reference for ${type} not found`);
        }
    };

    const toggleAudio = () => {
        const newState = !isAudioEnabled;
        setIsAudioEnabled(newState);
        localStorage.setItem('dashboard-audio-enabled', String(newState));
        
        if (newState) {
            console.log('[Audio] Enabling and priming audio context...');
            setIsAudioBlocked(false);
            playAlert('ORDER'); // Play a sound immediately to unlock the context
        } else {
            setIsPrimed(false);
            setIsAudioBlocked(false);
        }
    };

    // Auto-prime on first interaction if enabled
    useEffect(() => {
        if (!isAudioEnabled || isPrimed) return;

        const handleInteraction = () => {
            if (isAudioEnabled && !isPrimed) {
                console.log('[Audio] Context priming interaction detected...');
                const audio = audioRefs.current['ORDER'];
                if (audio) {
                    audio.volume = 0; // Silent play to prime
                    audio.play()
                        .then(() => {
                            audio.volume = 1.0;
                            setIsPrimed(true);
                            setIsAudioBlocked(false);
                            console.log('[Audio] Context successfully primed via interaction');
                        })
                        .catch(() => {
                             setIsAudioBlocked(true);
                        });
                }
            }
        };

        window.addEventListener('mousedown', handleInteraction, { once: true });
        window.addEventListener('touchstart', handleInteraction, { once: true });
        window.addEventListener('keydown', handleInteraction, { once: true });

        return () => {
            window.removeEventListener('mousedown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, [isAudioEnabled, isPrimed]);

    const addNotification = (message: string, type: keyof typeof sounds = 'ORDER') => {
        const id = Math.random().toString();
        setNotifications(prev => [...prev, { id, message }]);
        playAlert(type);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 6000);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const { data: restaurant } = useQuery({
        queryKey: ['my-restaurant'],
        queryFn: () => restaurantService.getMyRestaurant(profile?.id),
        enabled: !!profile?.id && currentRole === 'restaurant'
    });

    useEffect(() => {
        if (!profile?.id) return;

        let filterString = undefined;
        if (currentRole === 'restaurant' && restaurant?.id) {
            filterString = `restaurant_id=eq.${restaurant.id}`;
        } else if (currentRole === 'restaurant' && !restaurant?.id) {
            return; // Wait for restaurant ID to load
        }

        const channelOpts: any = {
            event: '*',
            schema: 'public',
            table: 'orders'
        };
        if (filterString) channelOpts.filter = filterString;

        const channel = supabase.channel('global-orders')
            .on(
                'postgres_changes',
                channelOpts,
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
                    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
                    queryClient.invalidateQueries({ queryKey: ['recent-orders'] });

                    if (payload.eventType === 'INSERT') {
                        const newOrder = payload.new as any;
                        console.log('[Realtime] New order inserted:', newOrder.id, 'Status:', newOrder.status);
                        
                        // Notify for any new order (including pending)
                        const shortId = newOrder?.id ? newOrder.id.slice(0, 5).toUpperCase() : 'NEW';
                        addNotification(`New order #${shortId} has arrived!`, 'ORDER');
                    } else if (payload.eventType === 'UPDATE') {
                        const oldOrder = payload.old as any;
                        const newOrder = payload.new as any;
                        console.log('[Realtime] Order updated:', newOrder.id, 'Old Status:', oldOrder.status, 'New Status:', newOrder.status);
                        
                        // Also notify when payment is confirmed
                        if (oldOrder.status === 'pending' && newOrder.status === 'confirmed') {
                            const shortId = newOrder?.id ? newOrder.id.slice(0, 5).toUpperCase() : 'NEW';
                            addNotification(`Payment confirmed for Order #${shortId}!`, 'ORDER');
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'payouts'
                },
                (payload) => {
                    console.log('[Realtime] New payout request:', payload.new.id);
                    queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
                    const newPayout = payload.new as any;
                    addNotification(`New Payout Request: $${Number(newPayout.amount).toFixed(2)}`, 'PAYOUT');
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'driver_profiles'
                },
                (payload) => {
                    console.log('[Realtime] New driver application:', payload.new.user_id);
                    if (currentRole === 'admin') {
                        queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
                        addNotification(`New Driver Application received!`, 'DRIVER');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, currentRole, restaurant?.id, queryClient]);

    // Background Notification Sound Bridge: Listen for messages from Service Worker
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'PUSH_RECEIVED') {
                const payload = event.data.payload;
                const type = payload.data?.type === 'NEW_ORDER' ? 'ORDER' : 
                             payload.data?.type === 'NEW_PAYOUT' ? 'PAYOUT' : 
                             payload.data?.type === 'NEW_DRIVER' ? 'DRIVER' : 'ORDER';
                
                // Only play sound if tab is hidden (already handled by Realtime if tab is active)
                if (document.hidden) {
                    playAlert(type as any);
                    console.log(`[SW Bridge] Playing ${type} sound in background.`);
                }
            }
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }, [isAudioEnabled]);

    const navItems = currentRole === 'restaurant' ? [
        { to: '/restaurant/overview', icon: LayoutDashboard, label: 'Overview' },
        { to: '/restaurant/orders', icon: Bell, label: 'Orders' },
        { to: '/restaurant/menu', icon: Utensils, label: 'Menu' },
        { to: '/restaurant/settings', icon: Settings, label: 'Settings' },
    ] : [
        { to: '/admin/overview', icon: LayoutDashboard, label: 'Ops Console' },
        { to: '/admin/orders', icon: Bell, label: 'Global Orders' },
        { to: '/admin/restaurants', icon: Utensils, label: 'Restaurants' },
        { to: '/admin/drivers', icon: Bike, label: 'Drivers' },
        { to: '/admin/payouts', icon: Wallet, label: 'Payout Requests' },
        { to: '/admin/dispatch', icon: Navigation, label: 'Dispatch Control' },
        { to: '/admin/config', icon: Settings, label: 'App Config' },
    ];

    return (
        <div className="min-h-screen bg-background text-white flex flex-col">
            {/* Audio Activation Guard */}
            {isAudioEnabled && !isPrimed && (
                <AudioActivationOverlay onActivate={() => playAlert('ORDER')} />
            )}

            {/* Top Bar (Fixed) */}
            <header className="h-16 border-b border-white/5 px-4 md:px-6 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-md z-30">
                <div className="flex items-center gap-3 md:gap-4">
                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 -ml-2 rounded-lg hover:bg-white/5 md:hidden transition-colors"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-xl italic">A</div>
                        <h1 className="text-xl font-bold tracking-tight hidden sm:block">Appetite</h1>
                    </div>
                    <div className="h-6 w-[1px] bg-white/10 mx-2 hidden md:block" />
                    <div className="flex items-center gap-2">
                        {currentRole === 'admin' ? (
                            <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-white/5">Ops Console</span>
                        ) : (
                            <span className="bg-accent/10 px-3 py-1 rounded-full text-[10px] font-bold text-accent border border-accent/20 flex items-center gap-1.5 uppercase tracking-wider">
                                Restaurant Portal
                                {restaurant && <span className="opacity-70 text-white truncate max-w-[120px]">• {restaurant.name}</span>}
                            </span>
                        )}
                    </div>
                </div>

                {/* Global Search (Admin Only) */}
                {currentRole === 'admin' && (
                    <div className="hidden lg:flex flex-1 max-w-md mx-8 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search orders, restaurants, customers..."
                            className="w-full bg-surface border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                        />
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {/* Audio Toggle */}
                    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/5">
                        <button 
                            onClick={toggleAudio}
                            className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                                isAudioEnabled 
                                    ? "bg-accent text-white shadow-lg shadow-accent/20" 
                                    : "text-muted-foreground hover:bg-white/5"
                            )}
                            title={isAudioEnabled ? "Mute alerts" : "Unmute alerts"}
                        >
                            {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                        
                        {isAudioEnabled && (
                            <button
                                onClick={() => playAlert('ORDER')}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all",
                                    isAudioBlocked 
                                        ? "bg-red-500 text-white animate-pulse" 
                                        : "text-accent hover:bg-accent/10"
                                )}
                                title={isAudioBlocked ? "Sound is blocked! Click to enable" : "Play test sound"}
                            >
                                {isAudioBlocked ? "Fix Sound" : "Test Sound"}
                            </button>
                        )}
                    </div>

                    {/* Notifications */}
                    <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface transition-colors">
                        <Bell size={18} className="text-muted-foreground" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-accent border-2 border-background" />
                    </button>

                    <div className="h-6 w-[1px] bg-white/10 mx-1" />

                    {/* Profile Menu */}
                    <div className="flex items-center gap-3 group relative cursor-pointer">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold leading-tight">{profile?.full_name || 'User'}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center overflow-hidden border border-white/10">
                            <User size={18} className="text-muted-foreground" />
                        </div>

                        {/* Dropdown menu */}
                        <div className="absolute top-full right-0 mt-2 w-48 py-2 bg-surface border border-white/5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl">
                            <button 
                                onClick={() => window.location.href = '/'} 
                                className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-white/5 flex items-center gap-2 transition-colors border-b border-white/5"
                            >
                                <User size={16} /> Switch to Customer
                            </button>
                            <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors">
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Side Navigation */}
                <aside className={cn(
                    "fixed md:relative inset-y-0 left-0 w-64 border-r border-white/5 p-4 bg-background overflow-y-auto z-50 md:z-auto transition-transform duration-300 md:translate-x-0",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    {/* Mobile Close Button */}
                    <div className="flex md:hidden items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-xl italic text-white">A</div>
                            <span className="text-xl font-bold tracking-tight">Appetite</span>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-lg">
                            <X size={24} />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-1" onClick={() => setIsMobileMenuOpen(false)}>
                        {navItems.map((item) => (
                            <SidebarLink
                                key={item.to}
                                {...item}
                                active={location.pathname === item.to}
                            />
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-background/50">
                    <div className="p-4 md:p-8 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Global Toasts */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
                {notifications.map(n => (
                    <div key={n.id} className="bg-accent text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
                        <Bell size={24} className="animate-bounce" />
                        <div>
                            <p className="font-bold text-sm">Incoming Alert</p>
                            <p className="text-sm opacity-90">{n.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
