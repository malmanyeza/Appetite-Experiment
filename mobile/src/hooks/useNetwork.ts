import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * A hook to track network connectivity.
 * Uses native NetInfo for reliable real-time connectivity status.
 */
export const useNetwork = () => {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Subscribe to network state changes
        const unsubscribe = NetInfo.addEventListener(state => {
            // Consider the app online if it's connected and has internet reachability
            setIsOnline(!!state.isConnected && !!state.isInternetReachable);
        });

        // Initial check on mount
        NetInfo.fetch().then(state => {
            setIsOnline(!!state.isConnected && !!state.isInternetReachable);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return { isOnline };
};
