import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RosterioMark from "../../components/RosterioMark";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import { useAuth } from "../../context/AuthContext";
import glassTheme from "../../theme/glassTheme";
import { useNavigation } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";

let BlurView;
try { BlurView = require("expo-blur").BlurView; } catch (e) { BlurView = null; }

const LoginScreen = () => {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  // redirectTo is set when the user was bounced here from a deep link that
  // requires auth (e.g. /invites/{accountId}/{token}).
  const { redirectTo } = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        Alert.alert(
          "Sign In Failed",
          result.error || "Unable to connect to server. Please check your connection."
        );
      } else if (
        redirectTo &&
        typeof redirectTo === "string" &&
        // Allow-list: only deep-link destinations we trust may be navigated to
        // post-login. Prevents a malicious link like `?redirectTo=/(app)/admin`
        // from bouncing an unauthenticated user into a privileged screen.
        redirectTo.startsWith("/invites/")
      ) {
        router.replace(redirectTo);
      }
      // If no redirectTo, AuthGate in _layout.tsx will handle the redirect to /(app).
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Sign In Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const useBlur = !liquidGlass && Platform.OS === "ios" && BlurView != null;
  const GlassForm = liquidGlass ? GlassView : useBlur ? BlurView : View;
  const glassProps = liquidGlass
    ? { glassEffectStyle: "regular" }
    : useBlur
    ? { intensity: 55, tint: "light" }
    : {};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={glassTheme.colors.gradients.auth}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.bg}
        pointerEvents="none"
      />
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo section */}
        <View style={styles.logoSection}>
          <View style={styles.logoSquare}>
            <RosterioMark size={38} color={glassTheme.colors.primary} />
          </View>
          <Text style={styles.appName}>Rosterio</Text>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>

        {/* Glass form card */}
        <GlassForm
          {...glassProps}
          style={[styles.formCard, !useBlur && styles.formCardFallback]}
        >
          <View style={styles.specular} pointerEvents="none" />

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={glassTheme.colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="your@email.com"
                placeholderTextColor={glassTheme.colors.text.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={glassTheme.colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder="Enter password"
                placeholderTextColor={glassTheme.colors.text.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={glassTheme.colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In button */}
          <TouchableOpacity
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </GlassForm>

        {/* Forgot password */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => navigation.navigate("forgot-password")}
        >
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </TouchableOpacity>

        {/* Kiosk setup — surfaced for managers who tap into a fresh device */}
        <TouchableOpacity
          style={styles.kioskRow}
          onPress={() => router.push("/(kiosk)/pair")}
          accessibilityRole="button"
          accessibilityLabel="Set up kiosk"
        >
          <Ionicons name="qr-code-outline" size={16} color={glassTheme.colors.text.tertiary} />
          <Text style={styles.kioskText}>I'm setting up a kiosk</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const INPUT_BG = "rgba(0,0,0,0.04)";
const INPUT_BORDER = "rgba(0,0,0,0.09)";

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Logo
  logoSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoSquare: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: glassTheme.colors.wash.black,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    ...glassTheme.shadows.large,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.7,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
    fontWeight: "400",
    letterSpacing: 0.1,
  },

  // Glass form card
  formCard: {
    borderRadius: glassTheme.radius.xlarge,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    backgroundColor: "#FFFFFF",
    padding: 24,
    ...glassTheme.shadows.large,
    marginBottom: 20,
  },
  formCardFallback: {
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  specular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: glassTheme.glass.light.specular,
    zIndex: 1,
  },

  // Inputs
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: glassTheme.colors.text.secondary,
    marginBottom: 8,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: glassTheme.radius.medium,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    paddingRight: 4,
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    paddingVertical: 13,
    paddingRight: 12,
    fontSize: 15,
    color: glassTheme.colors.text.primary,
  },
  passwordToggle: {
    padding: 12,
    minWidth: 44,
    alignItems: "center",
  },

  // Sign in button
  signInButton: {
    backgroundColor: glassTheme.colors.primary,
    paddingVertical: 15,
    borderRadius: glassTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    ...glassTheme.shadows.medium,
  },
  signInButtonDisabled: {
    opacity: 0.55,
  },
  signInButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Forgot
  forgotRow: {
    alignItems: "center",
    paddingVertical: 12,
  },
  forgotText: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500",
  },

  // Kiosk setup link
  kioskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
  },
  kioskText: {
    fontSize: 13,
    color: glassTheme.colors.text.tertiary,
    fontWeight: "500",
  },
});

export default LoginScreen;
