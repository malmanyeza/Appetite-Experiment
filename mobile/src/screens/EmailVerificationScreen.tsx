import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme';
import { Mail, ArrowLeft, RefreshCcw, CheckCircle } from 'lucide-react-native';

export const EmailVerificationScreen = ({ route, navigation }: any) => {
    const { email } = route.params || { email: 'your email' };
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleResendEmail = async () => {
        if (cooldown > 0) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) throw error;

            Alert.alert('Success', 'Verification email has been resent.');
            setCooldown(60); // 60 second cooldown
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resend verification email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Login')}
                >
                    <ArrowLeft color={theme.text} size={24} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
                        <View style={[styles.iconPulse, { backgroundColor: theme.accent, opacity: 0.15 }]} />
                        <Mail size={40} color={theme.accent} />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        We've sent a verification link to{' '}
                        <Text style={{ color: theme.text, fontWeight: 'bold' }}>{email}</Text>
                    </Text>
                </View>

                <View style={styles.instructions}>
                    <View style={styles.instructionItem}>
                        <CheckCircle size={18} color={theme.accent} />
                        <Text style={[styles.instructionText, { color: theme.textMuted }]}>
                            Click the link in the email to verify your account
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.primaryButtonText}>I've Verified, Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.secondaryButton, 
                            { borderColor: theme.border },
                            cooldown > 0 && { opacity: 0.6 }
                        ]}
                        onPress={handleResendEmail}
                        disabled={loading || cooldown > 0}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.text} />
                        ) : (
                            <>
                                <RefreshCcw size={18} color={theme.text} />
                                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 20 : 40,
        left: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: { alignItems: 'center', marginBottom: 40 },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    iconPulse: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    instructions: { marginBottom: 40, gap: 16 },
    instructionItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    instructionText: { fontSize: 14, flex: 1 },
    actions: { gap: 12 },
    primaryButton: {
        height: 60,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#FF4D00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    secondaryButton: {
        height: 60,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    secondaryButtonText: { fontSize: 16, fontWeight: '600' },
    footerLink: { marginTop: 32, alignItems: 'center' },
    footerLinkText: { fontSize: 15 },
});
