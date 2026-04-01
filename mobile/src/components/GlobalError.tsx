import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Platform } from 'react-native';
import { AlertCircle, RefreshCw, Home, Search, Heart, ShoppingBag, User } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

interface GlobalErrorProps {
    error: Error;
    resetErrorBoundary: () => void;
    isPartial?: boolean;
}

export const GlobalError: React.FC<GlobalErrorProps> = ({ error, resetErrorBoundary, isPartial = false }) => {
    const { theme, isDark } = useTheme();

    const handleRetry = () => {
        resetErrorBoundary();
    };

    if (isPartial) {
        return (
            <View style={[styles.partialContainer, { backgroundColor: theme.surface }]}>
                <AlertCircle size={32} color={theme.accent} />
                <Text style={[styles.partialText, { color: theme.text }]}>Something went wrong loading this part</Text>
                <TouchableOpacity onPress={handleRetry} style={styles.retryButtonSmall}>
                    <RefreshCw size={16} color={theme.accent} />
                    <Text style={[styles.retryTextSmall, { color: theme.accent }]}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: `${theme.accent}15` }]}>
                    <AlertCircle size={80} color={theme.accent} strokeWidth={1.5} />
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.text }]}>Oops! Something{'\n'}unplugged itself.</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        We've hit a small technical bump. Don't worry, your appetite is still safe with us!
                    </Text>
                </View>

                {__DEV__ && (
                    <View style={[styles.devContainer, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.devTitle, { color: theme.accent }]}>Debug Info:</Text>
                        <Text style={[styles.devText, { color: theme.text }]}>{error.message}</Text>
                    </View>
                )}

                <View style={[styles.buttonContainer, { gap: 16 }]}>
                    <TouchableOpacity 
                        style={[styles.retryButton, { backgroundColor: theme.accent }]}
                        onPress={handleRetry}
                    >
                        <RefreshCw size={20} color="white" />
                        <Text style={styles.retryButtonText}>Refresh App</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Nav Mockup for stability feel */}
            {!isPartial && (
                <View style={[styles.bottomNav, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
                    <View style={styles.bottomNavItem}><Home size={24} color={theme.textMuted} /></View>
                    <View style={styles.bottomNavItem}><Search size={24} color={theme.textMuted} /></View>
                    <View style={styles.bottomNavItem}><ShoppingBag size={24} color={theme.textMuted} /></View>
                    <View style={styles.bottomNavItem}><Heart size={24} color={theme.textMuted} /></View>
                    <View style={styles.bottomNavItem}><User size={24} color={theme.textMuted} /></View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        lineHeight: 36,
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        width: '100%',
    },
    retryButton: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
    },
    devContainer: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
        borderLeftWidth: 4,
        borderLeftColor: '#FF4D00',
    },
    devTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    devText: {
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    bottomNav: {
        height: 70,
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingBottom: 10,
    },
    bottomNavItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    partialContainer: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#FF4D0020'
    },
    partialText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    retryButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    retryTextSmall: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
