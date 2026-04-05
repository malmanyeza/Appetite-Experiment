import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme';
import { Mail, ArrowLeft, RefreshCcw, CheckCircle, Smartphone } from 'lucide-react-native';
import { TextInput } from 'react-native'; // Added missing TextInput import

export const EmailVerificationScreen = ({ route, navigation }: any) => {
    const { email } = route.params || { email: 'your email' };
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [otp, setOtp] = useState('');
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

    const handleVerifyOTP = async () => {
        if (otp.length !== 8) {
            Alert.alert('Invalid Code', 'Please enter the 8-digit code sent to your email.');
            return;
        }

        setVerifying(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup',
            });

            if (error) throw error;

            Alert.alert('Success', 'Your email has been verified successfully!');
            // Navigation handled by auth listener
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message || 'Invalid or expired code.');
        } finally {
            setVerifying(false);
        }
    };

    const handleResendEmail = async () => {
        if (cooldown > 0) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) throw error;

            Alert.alert('Success', 'A new verification code has been sent.');
            setCooldown(60); // 60 second cooldown
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resend verification code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
        <SafeAreaView style={{ flex: 1 }}>
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
                    <Text style={[styles.title, { color: theme.text }]}>Verify your email</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        Enter the 8-digit verification code sent to{' '}
                        <Text style={{ color: theme.text, fontWeight: 'bold' }}>{email}</Text>
                    </Text>
                </View>

                <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                    <Smartphone size={20} color={theme.textMuted} />
                    <TextInput
                        style={[styles.otpInput, { color: theme.text }]}
                        placeholder="00000000"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="number-pad"
                        maxLength={8}
                        value={otp}
                        onChangeText={setOtp}
                        autoFocus={true}
                    />
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                        onPress={handleVerifyOTP}
                        disabled={verifying || otp.length !== 8}
                    >
                        {verifying ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Verify Code</Text>
                        )}
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
                                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
        </KeyboardAvoidingView>
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 60,
        borderRadius: 16,
        gap: 12,
        marginBottom: 32,
    },
    otpInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 4,
        textAlign: 'center',
        height: '100%',
        minHeight: 40,
    },
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
