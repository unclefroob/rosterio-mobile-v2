import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../components/Toast";
import { updateProfile, changePassword } from "../../services/apiHelper";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import glassTheme from "../../theme/glassTheme";
import { useNavigation, useRoute } from "@react-navigation/native";

let BlurView;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState(
    route.params?.section || "profile"
  );

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (state.user) {
      setProfileData({
        name: state.user.name || "",
        email: state.user.email || "",
        phone: state.user.phone || ""
      });
    }
  }, [state.user]);

  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profileData.name || !profileData.email) {
      Alert.alert("Error", "Name and email are required");
      return;
    }

    try {
      setSavingProfile(true);
      const result = await updateProfile(profileData);

      if (result.success) {
        await refreshUser();
        toast.success("Profile updated successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", result.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      Alert.alert("Error", "Current password and new password are required");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("Error", "New password and confirm password do not match");
      return;
    }

    try {
      setChangingPassword(true);
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (result.success) {
        toast.success("Password changed successfully");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        Alert.alert("Error", result.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      Alert.alert("Error", "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const CardContainer = liquidGlass ? GlassView : (BlurView || View);
  const cardProps = liquidGlass
    ? { glassEffectStyle: "regular" }
    : BlurView
    ? { intensity: 20, tint: "light" }
    : {};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
      >
        <View style={styles.content}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeSection === "profile" && styles.tabActive
              ]}
              onPress={() => setActiveSection("profile")}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={
                  activeSection === "profile"
                    ? glassTheme.colors.primary
                    : glassTheme.colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeSection === "profile" && styles.tabLabelActive
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeSection === "password" && styles.tabActive
              ]}
              onPress={() => setActiveSection("password")}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={
                  activeSection === "password"
                    ? glassTheme.colors.primary
                    : glassTheme.colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeSection === "password" && styles.tabLabelActive
                ]}
              >
                Password
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          {activeSection === "profile" && (
            <CardContainer style={styles.card} {...cardProps}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Edit Profile</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.name}
                  onChangeText={(value) => handleProfileChange("name", value)}
                  placeholder="Enter your name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.email}
                  onChangeText={(value) => handleProfileChange("email", value)}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.phone}
                  onChangeText={(value) => handleProfileChange("phone", value)}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  savingProfile && styles.saveButtonDisabled
                ]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </CardContainer>
          )}

          {/* Password Section */}
          {activeSection === "password" && (
            <CardContainer style={styles.card} {...cardProps}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Change Password</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordData.currentPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: value
                      }))
                    }
                    placeholder="Enter current password"
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye-off" : "eye"}
                      size={20}
                      color={glassTheme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordData.newPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: value
                      }))
                    }
                    placeholder="Enter new password"
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={20}
                      color={glassTheme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordData.confirmPassword}
                    onChangeText={(value) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: value
                      }))
                    }
                    placeholder="Confirm new password"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color={glassTheme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  changingPassword && styles.saveButtonDisabled
                ]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Change Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </CardContainer>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: glassTheme.colors.background.primary
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120
  },
  content: {
    padding: 16
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: `${glassTheme.colors.primary}20`
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500"
  },
  tabLabelActive: {
    color: glassTheme.colors.primary,
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: glassTheme.radius.large,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    shadowColor: glassTheme.shadow.color,
    shadowOffset: glassTheme.shadow.offset,
    shadowOpacity: glassTheme.shadow.opacity,
    shadowRadius: glassTheme.shadow.radius,
    elevation: glassTheme.shadow.elevation
  },
  cardHeader: {
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: glassTheme.colors.text.primary
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 8
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: glassTheme.colors.text.primary,
    borderWidth: 1,
    borderColor: glassTheme.border.color
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: glassTheme.border.color
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: glassTheme.colors.text.primary
  },
  passwordToggle: {
    padding: 12
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glassTheme.colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  }
});

export default EditProfileScreen;
