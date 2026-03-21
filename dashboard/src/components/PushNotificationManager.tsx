import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, BellOff, X } from 'lucide-react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BLD_WNWSzhZvd9hqgkGQ2qTi1CjvOnhnxnNhz2B7Db6Jhk0HNTs3o2O6I1Ld5j5hOfT93HjjU10ErD0gjRAPcrc';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const PushNotificationManager = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        } else {
            setLoading(false);
        }
    }, []);

    const checkSubscription = async () => {
        try {
            // Use getRegistration instead of .ready to avoid hanging if no SW is registered yet
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                setIsSubscribed(false);
                if (Notification.permission !== 'denied') {
                    setShowBanner(true);
                }
                return;
            }

            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
            
            // If not subscribed and haven't asked yet (or denied), show banner
            if (!subscription && Notification.permission !== 'denied') {
                setShowBanner(true);
            }
        } catch (err) {
            console.error('Error checking subscription:', err);
        } finally {
            setLoading(false);
        }
    };

    const subscribe = async () => {
        if (!window.isSecureContext) {
            alert('Notifications require a secure connection (HTTPS). Please ensure you are accessing the dashboard over HTTPS.');
            return;
        }

        setLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permission not granted for notifications. Please check your browser address bar to allow notifications.');
            }

            // Register Service Worker if not already
            const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
            console.log('SW Registered:', registration);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Save to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('web_push_subscriptions')
                    .insert({
                        user_id: user.id,
                        subscription: subscription.toJSON()
                    });
                
                if (error && error.code !== '23505') { // Ignore unique constraint error
                    throw error;
                }
            }

            setIsSubscribed(true);
            setShowBanner(false);
            console.log('Successfully subscribed to Web Push');
        } catch (err: any) {
            console.error('Failed to subscribe to Web Push:', err);
            const errMsg = err?.message || 'Unknown error';
            alert(`Failed to enable notifications: ${errMsg}\n\nPlease check your browser settings or ensure you are using HTTPS.`);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                
                // Remove from Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('web_push_subscriptions')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('subscription->endpoint', subscription.endpoint);
                }
            }
            setIsSubscribed(false);
        } catch (err) {
            console.error('Error unsubscribing:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isSupported) return null;

    return (
        <>
            {/* Minimal Banner for first-time users */}
            {showBanner && !isSubscribed && (
                <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:w-96">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enable Notifications</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Get real-time alerts when new orders arrive, even if the dashboard is closed.
                                </p>
                                <div className="flex items-center gap-3 mt-4">
                                    <button 
                                        onClick={subscribe}
                                        disabled={loading}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Enabling...' : 'Enable Now'}
                                    </button>
                                    <button 
                                        onClick={() => setShowBanner(false)}
                                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
                                    >
                                        Maybe later
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle in settings or profile would use this part if needed */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 mb-8 shadow-sm">
                <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-200 dark:bg-slate-800'}`}>
                    {isSubscribed ? <Bell className="w-4 h-4 text-green-600" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold">{isSubscribed ? 'Notifications Active' : 'Notifications Disabled'}</p>
                    <p className="text-xs text-slate-500">{isSubscribed ? 'You will receive alerts for new orders.' : 'Enable to get real-time alerts.'}</p>
                </div>
                <button
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={loading}
                    className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all ${
                        isSubscribed 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50`}
                >
                    {loading ? 'Processing...' : (isSubscribed ? 'Disable' : 'Enable')}
                </button>
            </div>
        </>
    );
};
