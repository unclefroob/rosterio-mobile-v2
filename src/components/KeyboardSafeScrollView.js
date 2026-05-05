import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

/**
 * Wrap any screen or modal body that contains a TextInput with this so the
 * software keyboard doesn't cover the focused field.
 *
 * iOS uses behavior="padding" — the standard fix.
 * Android leaves behavior undefined; the OS already pushes the view up when
 *   windowSoftInputMode=adjustResize (the Expo default). Setting behavior="height"
 *   on Android tends to cut content off and is worse than letting the OS handle it.
 *
 * Inside a <Modal>, KeyboardAvoidingView does NOT inherit context from the
 * parent screen — the modal mounts on its own RN root — so each modal needs
 * its own wrapper. Use this component for that.
 */
const KeyboardSafeScrollView = ({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  scrollEnabled = true,
  ...rest
}) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[styles.flex, style]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={[styles.grow, contentContainerStyle]}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
});

export default KeyboardSafeScrollView;
