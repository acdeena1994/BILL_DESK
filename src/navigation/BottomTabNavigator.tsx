import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChartBar, Package, Settings as SettingsIcon } from 'lucide-react-native';
import { BiReceiptCutoff } from '../components/BiReceiptCutoff';
import { MainTabParamList } from './types';
import { BillingScreen } from '../screens/Billing/BillingScreen';
import { AnalyticsScreen } from '../screens/Analytics/AnalyticsScreen';
import { StockScreen } from '../screens/Stock/StockScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { Colors } from '../theme/colors';
import { FONT_SCALE_LIMITS } from '../theme/typography';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 6);
  const tabHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      initialRouteName="Billing"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent, // Accent Blue #091540
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarAllowFontScaling: true,
        tabBarStyle: [
          styles.tabBar,
          {
            minHeight: tabHeight,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.tabBar}
              numberOfLines={1}
              style={[styles.tabBarLabel, { color }]}
            >
              {t('nav.billing', 'Billing')}
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <BiReceiptCutoff size={21} color={focused ? Colors.accent : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.tabBar}
              numberOfLines={1}
              style={[styles.tabBarLabel, { color }]}
            >
              {t('nav.analytics', 'Analytics')}
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <ChartBar size={21} color={focused ? Colors.accent : color} strokeWidth={focused ? 2.3 : 1.8} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Stock"
        component={StockScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.tabBar}
              numberOfLines={1}
              style={[styles.tabBarLabel, { color }]}
            >
              {t('nav.stock', 'Stock')}
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <Package size={21} color={focused ? Colors.accent : color} strokeWidth={focused ? 2.3 : 1.8} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={FONT_SCALE_LIMITS.tabBar}
              numberOfLines={1}
              style={[styles.tabBarLabel, { color }]}
            >
              {t('nav.settings', 'Settings')}
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
              <SettingsIcon size={21} color={focused ? Colors.accent : color} strokeWidth={focused ? 2.3 : 1.8} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconBox: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: Colors.accentLight,
  },
});

export default BottomTabNavigator;
