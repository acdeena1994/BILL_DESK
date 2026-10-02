import { Bill } from '../db/billQueries';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Main: undefined;
  BillPreview: {
    mode: 'new' | 'view';
    bill?: Bill;
  };
};

export type MainTabParamList = {
  Billing: undefined;
  Analytics: undefined;
  Stock: undefined;
  Settings: undefined;
};
