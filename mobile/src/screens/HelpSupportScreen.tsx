import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../theme';

export const HelpSupportScreen = ({ navigation }: any) => {
    const { theme } = useTheme();

    const emails = [
        'mmanyeza@nexura.co.zw',
        'nmanyeza@nexura.co.zw',
        'fnyokanhete@nexura.co.zw'
    ];

    const handleEmail = (email: string) => {
        Linking.openURL(`mailto:${email}?subject=Appetite Support Request`);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={theme.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={[styles.iconCircle, { backgroundColor: `${theme.accent}15` }]}>
                        <CheckCircle2 color={theme.accent} size={48} />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>We're Here to Help</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        At Appetite, our commitment to quality goes beyond delivering your favorite meals. 
                        We want to ensure your experience on our platform is flawless, seamless, and delightful.
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted, marginTop: 12 }]}>
                        If you have any questions, feedback, or require technical assistance with your account or orders, our dedicated Nexura engineering and support team is standing by.
                    </Text>
                </View>

                <View style={styles.contactSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Our Team Direct</Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                        Tap to send us an email. We typically respond within 24 hours.
                    </Text>

                    <View style={styles.emailList}>
                        {emails.map((email, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={[styles.emailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                onPress={() => handleEmail(email)}
                            >
                                <View style={[styles.mailIconWrap, { backgroundColor: `${theme.accent}15` }]}>
                                    <Mail color={theme.accent} size={20} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.emailText, { color: theme.text }]}>{email}</Text>
                                    <Text style={[styles.emailSub, { color: theme.textMuted }]}>Nexura Support Rep</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        marginTop: Platform.OS === 'ios' ? 40 : 20 
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 24, paddingBottom: 60 },
    heroSection: { alignItems: 'center', marginBottom: 40 },
    iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
    contactSection: { marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    sectionSubtitle: { fontSize: 14, marginBottom: 20 },
    emailList: { gap: 12 },
    emailCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
    mailIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    emailText: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    emailSub: { fontSize: 12 }
});
