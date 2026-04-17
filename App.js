import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { AuthContextProvider, useAuth } from "./src/context/AuthContext";
import { PlanContextProvider, usePlan } from "./src/context/PlanContext";
import { ToastProvider } from "./src/components/Toast";
import LiquidTabBar from "./src/components/LiquidTabBar";
import glassTheme from "./src/theme/glassTheme";

import LoginScreen from "./src/screens/auth/LoginScreen";
import ForgotPasswordScreen from "./src/screens/auth/ForgotPasswordScreen";
import AccountSelectScreen from "./src/screens/auth/AccountSelectScreen";
import DashboardScreen from "./src/screens/dashboard/DashboardScreen";
import MarketplaceScreen from "./src/screens/marketplace/MarketplaceScreen";
import ShiftDetailsScreen from "./src/screens/marketplace/ShiftDetailsScreen";
import MyShiftsScreen from "./src/screens/myshifts/MyShiftsScreen";
import ProfileScreen from "./src/screens/profile/ProfileScreen";
import EditProfileScreen from "./src/screens/profile/EditProfileScreen";
import MyClaimsScreen from "./src/screens/claims/MyClaimsScreen";
import SplashScreen from "./src/screens/SplashScreen";

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#FFFFFF", // matches screen background — eliminates the white safe-area flash
  },
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const glassHeaderOptions = {
  headerStyle: {
    backgroundColor: glassTheme.colors.background.primary,
    shadowColor: "transparent",
    borderBottomWidth: 0,
    elevation: 0,
  },
  headerTintColor: glassTheme.colors.primary,
  headerTitleStyle: {
    fontFamily: "DMSans_600SemiBold",
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  headerBackTitleVisible: false,
};

const MarketplaceNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} />
    <Stack.Screen
      name="ShiftDetails"
      component={ShiftDetailsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="MyClaims"
      component={MyClaimsScreen}
      options={{ headerShown: true, title: "My Claims", ...glassHeaderOptions }}
    />
  </Stack.Navigator>
);

const MyShiftsNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyShiftsList" component={MyShiftsScreen} />
    <Stack.Screen
      name="ShiftDetails"
      component={ShiftDetailsScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const ProfileNavigator = () => (
  <Stack.Navigator screenOptions={glassHeaderOptions}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: "Profile" }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
  </Stack.Navigator>
);

const AppTabs = () => {
  const { hasMarketplace } = usePlan();
  // Don't block on planLoading — render tabs immediately after auth.
  // hasMarketplace defaults to false until plan resolves, so Marketplace
  // tab simply appears once loaded rather than blocking navigation.

  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Home" }} />
      {hasMarketplace && (
        <Tab.Screen name="Marketplace" component={MarketplaceNavigator} options={{ title: "Market" }} />
      )}
      <Tab.Screen name="MyShifts" component={MyShiftsNavigator} options={{ title: "Shifts" }} />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
};

function RootNavigator() {
  const { state } = useAuth();

  if (state.isLoading) return <SplashScreen />;

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!state.isSignedIn ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : !state.selectedAccount ? (
          <Stack.Screen
            name="AccountSelect"
            component={AccountSelectScreen}
            options={{ animationEnabled: false }}
          />
        ) : (
          <Stack.Screen name="App" component={AppTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  // fontError means fonts failed — fall back to system fonts rather than blocking
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthContextProvider>
        <PlanContextProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </PlanContextProvider>
      </AuthContextProvider>
    </SafeAreaProvider>
  );
}
