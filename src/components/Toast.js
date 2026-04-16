import React, { useState, useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, SafeAreaView } from 'react-native';
import glassTheme from '../theme/glassTheme';

let toastRef = null;

export const ToastProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('default'); // 'success' | 'error' | 'warning' | 'default'
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer = useRef(null);

  useEffect(() => {
    toastRef = { show };
    return () => { toastRef = null; };
  }, []);

  const show = (msg, toastType = 'default', duration = 3000) => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);

    if (timer.current) clearTimeout(timer.current);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, duration);
  };

  const bgColor = {
    success: glassTheme.colors.success,
    error: glassTheme.colors.danger,
    warning: glassTheme.colors.warning,
    default: glassTheme.colors.primary,
  }[type] || glassTheme.colors.primary;

  if (!visible) return <>{children}</>;

  return (
    <>
      {children}
      <SafeAreaView style={styles.container} pointerEvents="none">
        <Animated.View
          style={[styles.toast, { backgroundColor: bgColor, opacity, transform: [{ translateY }] }]}
        >
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      </SafeAreaView>
    </>
  );
};

export const toast = {
  show: (message, type = 'default', duration = 3000) => {
    if (toastRef) toastRef.show(message, type, duration);
  },
  success: (message, duration = 3000) => {
    if (toastRef) toastRef.show(message, 'success', duration);
  },
  error: (message, duration = 4000) => {
    if (toastRef) toastRef.show(message, 'error', duration);
  },
  warning: (message, duration = 3500) => {
    if (toastRef) toastRef.show(message, 'warning', duration);
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
