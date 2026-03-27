import { supabase } from '../lib/supabase';

/**
 * Service to handle restaurant and menu data fetching.
 * Centralizing logic here ensures that prefetching and 
 * on-demand fetching always use the same keys and filters.
 */
export const restaurantService = {
    /**
     * Fetch specific branch (location) details
     */
    getLocationDetails: async (locationId: string) => {
        const { data, error } = await supabase
            .from('restaurant_locations')
            .select('*')
            .eq('id', locationId)
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Fetch parent restaurant chain info
     */
    getRestaurantInfo: async (restaurantId: string) => {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Fetch menu items available for a specific branch
     */
    getBranchMenu: async (restaurantId: string, locationId: string) => {
        // Get all items for the chain
        const { data: items, error: mError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_available', true)
            .order('category');
        if (mError) throw mError;

        // Get location-specific availability overrides
        const { data: availability, error: aError } = await supabase
            .from('location_menu_items')
            .select('menu_item_id, is_available')
            .eq('location_id', locationId);
        
        if (aError) throw aError;

        // Filter based on location settings
        return (items || []).filter((item: any) => {
            const setting = availability?.find((a: any) => a.menu_item_id === item.id);
            return setting ? setting.is_available : true;
        });
    }
};
