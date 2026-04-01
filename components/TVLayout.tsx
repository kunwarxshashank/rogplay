import React, { useState, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';


interface TVLayoutProps {
    children: React.ReactNode;
}

/**
 * TVLayout - Wrapper component for TV screens that manages focus between sidebar and content
 * This enables proper remote navigation: left/right to move between sidebar and content
 */
export function TVLayout({ children }: TVLayoutProps) {
    const [isSidebarFocused, setIsSidebarFocused] = useState(false);

    if (!Platform.isTV) {
        return <>{children}</>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.contentArea}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    contentArea: {
        flex: 1,
    },
});
