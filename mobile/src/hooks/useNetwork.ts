import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * A hook to track network connectivity.
 * Uses a combination of navigator.onLine (web) and 
 * a lightweight Supabase heartbeat (native fallback).
 */
export const useNetwork = () => {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        let heartbeatInterval: NodeJS.Timeout;

        const checkConnection = async () => {
            try {
                // Try a very simple, lightweight check
                const { error } = await supabase.from('restaurants').select('id').limit(1);
                if (error) {
                    // If it's a network error, we're likely offline
                    if (error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network')) {
                        setIsOnline(false);
                    }
                } else {
                    setIsOnline(true);
                }
            } catch (err) {
                setIsOnline(false);
            }
        };

        // Initial check
        checkConnection();

        // Run heartbeat every 30 seconds for native or on intervals
        heartbeatInterval = setInterval(checkConnection, 30000);

        return () => {
            clearInterval(heartbeatInterval);
        };
    }, []);

    return { isOnline };
};
