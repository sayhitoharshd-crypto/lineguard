import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthProvider, useAuth } from './src/firebase/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ReportScreen from './src/screens/ReportScreen';
import ShameScreen from './src/screens/ShameScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StaffScreen from './src/screens/StaffScreen';
import ReelsScreen from './src/screens/ReelsScreen';
import { ToastHost } from './src/components/ui';
import { G, C } from './src/theme';

const Tab = createBottomTabNavigator();
const icon = (e) => ({ focused }) => <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{e}</Text>;

function Root() {
  const { user, loading, staff } = useAuth();
  const [guestMode, setGuestMode] = useState(false);
  useEffect(() => { if (user) setGuestMode(false); }, [user]);
  if (loading) {
    return (
      <LinearGradient colors={G.main} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }
  if (!user && !guestMode) return <LoginScreen onBrowse={() => setGuestMode(true)} />;
  if (!user && guestMode) {
    return (
      <NavigationContainer>
        <Tab.Navigator screenOptions={{
          headerShown: false, tabBarActiveTintColor: C.purple2, tabBarInactiveTintColor: '#d8b4fe',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
          tabBarStyle: { height: 68, paddingBottom: 10, paddingTop: 6, borderTopColor: '#f0e6ff' },
        }}>
          <Tab.Screen name="Reels" component={ReelsScreen} options={{ tabBarIcon: icon('🎬') }} />
          <Tab.Screen name="Sign in" component={LoginScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.purple2,
        tabBarInactiveTintColor: '#d8b4fe',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
        tabBarStyle: { height: 68, paddingBottom: 10, paddingTop: 6, borderTopColor: '#f0e6ff' },
      }}>
        <Tab.Screen name="Reels" component={ReelsScreen} options={{ tabBarIcon: icon('🎬') }} />
        <Tab.Screen name="Report" component={ReportScreen} options={{ tabBarIcon: icon('🚩') }} />
        <Tab.Screen name="Shame" component={ShameScreen} options={{ tabBarIcon: icon('📋') }} />
        <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarIcon: icon('💬') }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon('⭐') }} />
        {staff && <Tab.Screen name="Staff" component={StaffScreen} options={{ tabBarIcon: icon('👮') }} />}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthProvider>
          <Root />
          <ToastHost />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
