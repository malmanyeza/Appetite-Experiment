import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { User, Phone, Save, ChevronLeft, CreditCard } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export const ProfileScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const { profile, user, roles, refreshProfile } = useAuthStore();
    const queryClient = useQueryClient();
    const isDriver = roles.includes('driver');

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [ecocashNumber, setEcocashNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isDriver) {
            fetchDriverDetails();
        }
    }, [isDriver]);

    const fetchDriverDetails = async () => {
        const { data, error } = await supabase
            .from('driver_profiles')
            .select('ecocash_number, account_name')
            .eq('user_id', user?.id)
            .single();
        if (data) {
            setEcocashNumber(data.ecocash_number || '');
            setAccountName(data.account_name || '');
        }
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Full name is required');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone || null
                })
                .eq('id', user?.id);

            if (error) throw error;

            if (isDriver) {
                const { error: driverError } = await supabase
                    .from('driver_profiles')
                    .update({
                        ecocash_number: ecocashNumber,
                        account_name: accountName
                    })
                    .eq('user_id', user?.id);
                if (driverError) throw driverError;
            }

            await refreshProfile();
            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft color={theme.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>FULL NAME</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                        <User size={20} color={theme.textMuted} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="John Doe"
                            placeholderTextColor={theme.textMuted}
                        />
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>PHONE NUMBER</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                        <Phone size={20} color={theme.textMuted} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+263 7..."
                            placeholderTextColor={theme.textMuted}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>EMAIL ADDRESS</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.surface, opacity: 0.6 }]}>
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={user?.email}
                            editable={false}
                        />
                    </View>
                    <Text style={[styles.hint, { color: theme.textMuted }]}>Email cannot be changed</Text>
                </View>

                {isDriver && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.accent }]}>PAYOUT DETAILS (ECOCASH)</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: theme.textMuted }]}>ECOCASH NUMBER</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                                <CreditCard size={20} color={theme.textMuted} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={ecocashNumber}
                                    onChangeText={setEcocashNumber}
                                    placeholder="077..."
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: theme.textMuted }]}>ECOCASH ACCOUNT NAME</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                                <User size={20} color={theme.textMuted} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    value={accountName}
                                    onChangeText={setAccountName}
                                    placeholder="Account Name"
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.accent }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Save size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingBottom: 20,
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    sectionHeader: { marginTop: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 16,
        height: 56,
        gap: 12,
    },
    input: { flex: 1, fontSize: 16, height: '100%' },
    hint: { fontSize: 12, marginTop: 4, marginLeft: 4 },
    saveButton: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
