import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { SplashScreen } from '../screens/Splash/SplashScreen';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { BillPreviewScreen } from '../screens/Billing/BillPreviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  initialRouteName?: keyof RootStackParamList;
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({ initialRouteName = 'Splash' }) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="BillPreview" component={BillPreviewScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
