import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Dimensions, Easing, View, Platform, ImageBackground } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
    onReady: () => void;
    isAppReady: boolean;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onReady, isAppReady }) => {
    const [animationDone, setAnimationDone] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const opacityAnim = useRef(new Animated.Value(1)).current;
    
    // Split the word for wave animation
    const word = 'appetite';
    const letterAnims = useRef(word.split('').map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // HIDE THE NATIVE SPLASH: Doing it here ensures there is zero gap
        // between the static image and our animation.
        import('expo-splash-screen').then(pkg => pkg.hideAsync().catch(() => {}));

        // Start the typography wave animation
        const animations = letterAnims.map((anim, index) => {
            return Animated.sequence([
                Animated.timing(anim, {
                    toValue: -15, // Move up
                    duration: 300,
                    delay: index * 100,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0, // Move back down
                    duration: 300,
                    easing: Easing.bounce,
                    useNativeDriver: true,
                })
            ]);
        });

        Animated.stagger(100, animations).start(() => {
            // Once the wave is complete, wait for the app to be ready
            if (isAppReady) {
                beginFadeOut();
            }
        });
    }, []);

    useEffect(() => {
        if (isAppReady && !animationDone && !isFading) {
            // Give it a tiny delay to ensure the wave had time to finish or is finishing
            setTimeout(() => {
                beginFadeOut();
            }, 500);
        }
    }, [isAppReady]);

    const beginFadeOut = () => {
        if (isFading) return;
        setIsFading(true);
        Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setAnimationDone(true);
            onReady();
        });
    };

    if (animationDone) return null;

    return (
        <Animated.View 
            pointerEvents={isFading ? "none" : "auto"}
            style={[
                styles.container, 
                { opacity: opacityAnim },
                isFading && { elevation: 0, zIndex: 0 }
            ]}
        >
            <ImageBackground
                source={require('../../assets/images/splash_bg.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                {/* Subtle Overlay for typography contrast */}
                <View style={styles.overlay}>
                    <View style={styles.textContainer}>
                        {word.split('').map((letter, index) => (
                            <Animated.Text
                                key={index}
                                style={[
                                    styles.logoText,
                                    { transform: [{ translateY: letterAnims[index] }] }
                                ]}
                            >
                                {letter}
                            </Animated.Text>
                        ))}
                    </View>
                </View>
            </ImageBackground>
        </Animated.View>
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FF4D00',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    textContainer: {
        flexDirection: 'row',
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)', // Subtle 10% dark overlay for readability
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 56, // Slightly larger for impact over the background
        fontWeight: 'bold',
        letterSpacing: -1,
        // Platform-agnostic system font approach
        fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
        textShadowColor: 'rgba(0, 0, 0, 0.4)', // Adds readability over the image
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10
    }
});
