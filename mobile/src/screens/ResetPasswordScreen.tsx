import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';
import { Lock, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react-native';

export const ResetPasswordScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { updatePassword } = useAuthStore();

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Missing Fields', 'Please fill in both password fields.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Insecure Password', 'Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await updatePassword(password);
            Alert.alert(
                'Success',
                'Your password has been reset successfully.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (error: any) {
            Alert.alert('Update Failed', error.message || 'Failed to update your password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => navigation.navigate('Login')}
                >
                    <ArrowLeft color={theme.text} size={24} />
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: theme.accent }]}>
                            <KeyRound color="white" size={32} />
                        </View>
                        <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
                        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                            Choose a strong new password for your account.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                            <Lock size={20} color={theme.textMuted} />
                            <TextInput
                                placeholder="New Password"
                                placeholderTextColor={theme.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                style={[styles.input, { color: theme.text }]}
                            />
                        </View>

                        <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                            <Lock size={20} color={theme.textMuted} />
                            <TextInput
                                placeholder="Confirm New Password"
                                placeholderTextColor={theme.textMuted}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                style={[styles.input, { color: theme.text }]}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.resetButton, { backgroundColor: theme.accent }]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.resetButtonText}>Update Password</Text>
                                    <CheckCircle2 color="white" size={20} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24 },
    backButton: {
        marginTop: Platform.OS === 'ios' ? 40 : 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: { marginTop: 40 },
    header: { alignItems: 'center', marginBottom: 48 },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#FF4D00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
    subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20, lineHeight: 24 },
    form: { gap: 16 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 60,
        borderRadius: 16,
        gap: 12,
    },
    input: { flex: 1, fontSize: 16 },
    resetButton: {
        height: 60,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 12,
        shadowColor: '#FF4D00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    resetButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
