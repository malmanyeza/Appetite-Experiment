import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    TextInput,
    Animated
} from 'react-native';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';
import { ChevronLeft, Trash2, MapPin, Smartphone, CheckCircle2, DollarSign } from 'lucide-react-native';
import { Image } from 'expo-image';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';


export const CartScreen = ({ navigation }: any) => {
    const { items, total, updateQty, clearCart } = useCartStore();
    const { profile } = useAuthStore();
    const { theme } = useTheme();
    const [loading, setLoading] = React.useState(false);
    const queryClient = useQueryClient();

    const { data: addresses } = useQuery({
        queryKey: ['addresses', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', profile?.id)
                .order('is_default', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.id
    });

    const [selectedAddress, setSelectedAddress] = React.useState<any>(null);
    const [paymentMethod, setPaymentMethod] = React.useState<'cod' | 'ecocash'>('ecocash');
    const [ecocashPhone, setEcocashPhone] = React.useState('');
    const [deliveryFee, setDeliveryFee] = React.useState(0);
    const [serviceFee, setServiceFee] = React.useState(0.5);

    const shakeAnimation = React.useRef(new Animated.Value(0)).current;
    const [phoneError, setPhoneError] = React.useState(false);

    const triggerShake = () => {
        setPhoneError(true);
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
        ]).start();
    };

    // Fetch Delivery Settings & Restaurant Location
    const restaurantId = items[0]?.restaurant_id; // Assumes all items are from same restaurant

    const { data: deliveryConfig } = useQuery({
        queryKey: ['delivery_config'],
        queryFn: async () => {
            const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'delivery_fee_config').single();
            if (error) throw error;
            return data?.value || { base_fee: 1.5, per_km_fee: 0.4, service_fee: 0.5, surge_amount: 0 };
        }
    });

    const { data: restaurant } = useQuery({
        queryKey: ['restaurant_location', restaurantId],
        queryFn: async () => {
            const { data, error } = await supabase.from('restaurants').select('lat, lng').eq('id', restaurantId).single();
            if (error) throw error;
            if (!data) throw new Error('Restaurant not found');
            return data;
        },
        enabled: !!restaurantId
    });

    React.useEffect(() => {
        const channel = supabase
            .channel('cart_system_settings_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'system_settings',
                    filter: "key=eq.delivery_fee_config"
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['delivery_config'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    // Distance Calculation Logic
    React.useEffect(() => {
        if (selectedAddress && restaurant && deliveryConfig) {
            const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const R = 6371; // km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const distance = Math.round(getDistance(
                restaurant.lat,
                restaurant.lng,
                selectedAddress.lat,
                selectedAddress.lng
            ));

            const base = Number(deliveryConfig.base_fee) || 1.5;
            const perKm = Number(deliveryConfig.per_km_fee) || 0.4;
            const surge = Number(deliveryConfig.surge_amount) || 0;
            const srv = Number(deliveryConfig.service_fee) || 0.5;

            setDeliveryFee(base + (distance * perKm) + surge);
            setServiceFee(srv);
        }
    }, [selectedAddress, restaurant, deliveryConfig]);

    React.useEffect(() => {
        if (addresses && addresses.length > 0 && !selectedAddress) {
            setSelectedAddress(addresses[0]);
        }
    }, [addresses]);

    const handleCheckout = async () => {
        if (items.length === 0) return;
        if (!selectedAddress) {
            Alert.alert('Address Required', 'Please add a delivery address before placing an order.', [
                { text: 'Add Address', onPress: () => navigation.navigate('AddressManagement') }
            ]);
            return;
        }
        if (paymentMethod === 'ecocash' && !ecocashPhone.trim()) {
            triggerShake();
            return;
        }

        setLoading(true);
        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) throw new Error('You must be logged in to place an order.');

            const response = await fetch(`${supabaseUrl}/functions/v1/place_order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({
                    items: items.map((item: any) => ({ id: item.id, qty: item.qty })),
                    address: {
                        label: selectedAddress.label,
                        city: selectedAddress.city,
                        suburb: selectedAddress.suburb,
                        street: selectedAddress.street,
                        landmark_notes: selectedAddress.landmark_notes,
                        lat: selectedAddress.lat,
                        lng: selectedAddress.lng
                    },
                    paymentMethod,
                    restaurantId: items[0].restaurant_id,
                    phone: paymentMethod === 'ecocash' ? ecocashPhone.trim() : undefined
                })
            });

            const rawText = await response.text();
            let data: any;
            try { data = JSON.parse(rawText); } catch (_) {
                throw new Error(`Server error (${response.status})`);
            }

            if (!response.ok) throw new Error(data?.error || `Server error (${response.status})`);
            if (data?.error) throw new Error(data.error);

            // EcoCash Express: two-step client-side submission
            if (data?.ecocashExpress) {
                const { initUrl, initFields, initFieldOrder, expressUrl, phone, method, integrationKey } = data.ecocashExpress;

                // Step 1: initiatetransaction
                const initBody = initFieldOrder.map((k: string) => `${encodeURIComponent(k)}=${encodeURIComponent(initFields[k])}`).join('&');
                const initResp = await fetch(initUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: initBody
                });
                const initText = await initResp.text();
                const initParams = new URLSearchParams(initText);

                if (initParams.get('status') !== 'Ok') {
                    throw new Error(initParams.get('error') || 'Failed to initiate Paynow transaction.');
                }

                const pollUrl = initParams.get('pollurl') || '';

                // Step 2: remotetransaction (EcoCash Express)
                const expressFields: Record<string, string> = {
                    resulturl: initFields.resulturl,
                    returnurl: initFields.returnurl,
                    reference: initFields.reference,
                    amount: initFields.amount,
                    id: initFields.id,
                    additionalinfo: initFields.additionalinfo,
                    authemail: initFields.authemail,
                    status: 'Message',
                    method: method,
                    phone: phone,
                    pollurl: decodeURIComponent(pollUrl)
                };

                const expressFieldOrder = ['resulturl', 'returnurl', 'reference', 'amount', 'id', 'additionalinfo', 'authemail', 'status', 'method', 'phone', 'pollurl'];

                // Get hash from server
                const signResp = await fetch(`${supabaseUrl}/functions/v1/sign_paynow`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': supabaseAnonKey,
                    },
                    body: JSON.stringify({
                        fields: expressFields,
                        fieldOrder: expressFieldOrder
                    })
                });

                if (!signResp.ok) throw new Error('Failed to sign Paynow request.');
                const { hash } = await signResp.json();
                expressFields.hash = hash;

                const expressBody = [...expressFieldOrder, 'hash'].map((k: string) => `${encodeURIComponent(k)}=${encodeURIComponent(expressFields[k])}`).join('&');
                const expressResp = await fetch(expressUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: expressBody
                });
                const expressText = await expressResp.text();
                const expressParams = new URLSearchParams(expressText);

                console.log('EcoCash Express response:', expressText);

                if (expressParams.get('status') !== 'Ok') {
                    throw new Error(expressParams.get('error') || 'EcoCash payment initiation failed.');
                }

                Alert.alert(
                    'EcoCash Payment Sent',
                    `A payment prompt has been sent to ${phone}. Please check your phone and enter your EcoCash PIN to complete payment.`,
                    [{ text: 'OK' }]
                );
            }

            clearCart();
            navigation.navigate('Home', { screen: 'HomeMain' });
            navigation.navigate('Tracking', { screen: 'TrackingMain', params: { orderId: data.orderId } });
        } catch (error: any) {
            console.error('Checkout Error:', error);
            Alert.alert('Checkout Error', error.message || 'Failed to process order.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft color={theme.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>My Cart</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.textMuted }}>Your cart is empty.</Text>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: theme.accent, marginTop: 20 }]}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <Text style={styles.buttonText}>Find Food</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.itemsSection}>
                            {items.map((item) => (
                                <View key={item.id} style={[styles.cartItem, { borderBottomColor: theme.border }]}>
                                    <Image source={item.image_url} style={styles.itemImage} contentFit="cover" />
                                    <View style={styles.itemInfo}>
                                        <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                                        <Text style={[styles.itemPrice, { color: theme.accent }]}>${item.price.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.qtyControls}>
                                        <TouchableOpacity onPress={() => updateQty(item.id, -1)}>
                                            <Text style={[styles.qtyBtn, { color: theme.text }]}>-</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.qtyText, { color: theme.text }]}>{item.qty}</Text>
                                        <TouchableOpacity onPress={() => updateQty(item.id, 1)}>
                                            <Text style={[styles.qtyBtn, { color: theme.text }]}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={[styles.section, { borderTopColor: theme.border }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Address</Text>
                            <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
                                <MapPin size={20} color={theme.accent} />
                                <View style={{ flex: 1 }}>
                                    {selectedAddress ? (
                                        <Text style={[styles.infoCardText, { color: theme.text }]}>
                                            {selectedAddress.street}, {selectedAddress.suburb}
                                        </Text>
                                    ) : (
                                        <Text style={[styles.infoCardText, { color: '#EF4444' }]}>No address selected</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => navigation.navigate('AddressManagement')}>
                                    <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{selectedAddress ? 'Change' : 'Add'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={[styles.section, { borderTopColor: theme.border }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Method</Text>
                            <View style={styles.paymentMethods}>
                                {[
                                    { id: 'ecocash', label: 'EcoCash', icon: Smartphone },
                                    { id: 'cod', label: 'Cash on Delivery', icon: DollarSign }
                                ].map((method) => (
                                    <TouchableOpacity
                                        key={method.id}
                                        style={[
                                            styles.infoCard,
                                            { backgroundColor: theme.surface, marginBottom: 8 },
                                            paymentMethod === method.id && { borderColor: theme.accent, borderWidth: 1 }
                                        ]}
                                        onPress={() => setPaymentMethod(method.id as any)}
                                    >
                                        <method.icon size={20} color={paymentMethod === method.id ? theme.accent : theme.textMuted} />
                                        <Text style={[styles.infoCardText, { color: theme.text }]}>{method.label}</Text>
                                        {paymentMethod === method.id && <CheckCircle2 size={20} color={theme.accent} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {paymentMethod === 'ecocash' && (
                                <Animated.View style={[
                                    styles.ecocashContainer,
                                    { backgroundColor: phoneError ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 77, 0, 0.05)' },
                                    { borderColor: phoneError ? '#EF4444' : theme.accent },
                                    { transform: [{ translateX: shakeAnimation }] }
                                ]}>
                                    <View style={styles.ecocashHeader}>
                                        <Smartphone size={20} color={phoneError ? '#EF4444' : theme.accent} />
                                        <Text style={[styles.ecocashTitle, { color: phoneError ? '#EF4444' : theme.accent }]}>
                                            EcoCash Phone Number Required
                                        </Text>
                                    </View>
                                    <TextInput
                                        style={[
                                            styles.ecocashInput,
                                            { backgroundColor: theme.surface, color: theme.text },
                                            phoneError && { borderColor: '#EF4444', borderWidth: 1 }
                                        ]}
                                        placeholder="Enter number (e.g. 0771234567)"
                                        placeholderTextColor={theme.textMuted}
                                        value={ecocashPhone}
                                        onChangeText={(text) => {
                                            setEcocashPhone(text);
                                            if (phoneError) setPhoneError(false);
                                        }}
                                        keyboardType="phone-pad"
                                        maxLength={12}
                                    />
                                    {phoneError && (
                                        <Text style={styles.errorText}>Please enter a valid phone number to proceed.</Text>
                                    )}
                                </Animated.View>
                            )}
                        </View>

                        <View style={styles.summaryBox}>
                            <View style={styles.summaryRow}>
                                <Text style={{ color: theme.textMuted }}>Subtotal</Text>
                                <Text style={{ color: theme.text }}>${total.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={{ color: theme.textMuted }}>Delivery Fee</Text>
                                <Text style={{ color: theme.text }}>${deliveryFee.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={{ color: theme.textMuted }}>Service Fee</Text>
                                <Text style={{ color: theme.text }}>${serviceFee.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }]}>
                                <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
                                <Text style={[styles.totalValue, { color: theme.accent }]}>${(total + deliveryFee + serviceFee).toFixed(2)}</Text>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {items.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                        onPress={handleCheckout}
                    >
                        <Text style={styles.buttonText}>
                            {paymentMethod === 'ecocash' ? 'Pay with EcoCash' : 'Place Order'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 20 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    itemsSection: { marginBottom: 32 },
    cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    itemImage: { width: 60, height: 60, borderRadius: 12 },
    itemInfo: { flex: 1, marginLeft: 16 },
    itemName: { fontSize: 16, fontWeight: '600' },
    itemPrice: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    qtyBtn: { fontSize: 20, fontWeight: 'bold', width: 24, textAlign: 'center' },
    qtyText: { fontSize: 16, fontWeight: '600' },
    section: { marginTop: 24, paddingTop: 24, borderTopWidth: 1 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
    infoCardText: { flex: 1, fontSize: 14 },
    paymentMethods: { gap: 8 },
    summaryBox: { marginTop: 32, padding: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    totalLabel: { fontSize: 18, fontWeight: 'bold' },
    totalValue: { fontSize: 20, fontWeight: 'bold' },
    phoneInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, marginTop: 16 },
    ecocashContainer: {
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
    },
    ecocashHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    ecocashTitle: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    ecocashInput: {
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 8,
        fontWeight: '500',
    },
    primaryButton: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    footer: { padding: 20, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#000' }
});
