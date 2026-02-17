import { useCallback } from 'react';
import { useAnalyticsContext } from '../context';
import { AUTH_EVENTS, ONBOARDING_EVENTS } from '../constants';
import type {
  SignupStartedProps,
  SignupCompletedProps,
  LoginProps,
  OAuthProps,
  OnboardingStepProps,
  RoleSelectedProps,
} from '../types';

export function useAuthAnalytics() {
  const { track, trackConversion, identify } = useAnalyticsContext();

  // ===== SIGNUP =====

  const trackSignupStarted = useCallback((props: SignupStartedProps) => {
    track({
      event_name: AUTH_EVENTS.SIGNUP_STARTED,
      event_category: 'auth',
      properties: props,
    });
  }, [track]);

  const trackSignupCompleted = useCallback((
    userId: string,
    props: SignupCompletedProps
  ) => {
    // Identify user first
    identify(userId, {
      signup_method: props.signup_method,
      user_role: props.user_role,
    });

    // Track as conversion (high-value event for ads)
    trackConversion({
      type: 'signup',
      properties: props,
    });

    // Also track as regular event
    track({
      event_name: AUTH_EVENTS.SIGNUP_COMPLETED,
      event_category: 'auth',
      properties: props,
    });
  }, [track, trackConversion, identify]);

  const trackSignupFailed = useCallback((error: string, method: string) => {
    track({
      event_name: AUTH_EVENTS.SIGNUP_FAILED,
      event_category: 'auth',
      properties: { error, signup_method: method },
    });
  }, [track]);

  // ===== LOGIN =====

  const trackLogin = useCallback((props: LoginProps) => {
    track({
      event_name: AUTH_EVENTS.LOGIN,
      event_category: 'auth',
      properties: props,
    });
  }, [track]);

  const trackLoginFailed = useCallback((error: string, method: string) => {
    track({
      event_name: AUTH_EVENTS.LOGIN_FAILED,
      event_category: 'auth',
      properties: { error, login_method: method },
    });
  }, [track]);

  const trackLogout = useCallback(() => {
    track({
      event_name: AUTH_EVENTS.LOGOUT,
      event_category: 'auth',
      properties: {},
    });
  }, [track]);

  // ===== OAUTH =====

  const trackOAuthStarted = useCallback((props: OAuthProps) => {
    track({
      event_name: AUTH_EVENTS.OAUTH_STARTED,
      event_category: 'auth',
      properties: props,
    });
  }, [track]);

  const trackOAuthCompleted = useCallback((props: OAuthProps) => {
    track({
      event_name: AUTH_EVENTS.OAUTH_COMPLETED,
      event_category: 'auth',
      properties: props,
    });
  }, [track]);

  // ===== PASSWORD =====

  const trackPasswordResetRequested = useCallback((email: string) => {
    track({
      event_name: AUTH_EVENTS.PASSWORD_RESET_REQUESTED,
      event_category: 'auth',
      properties: { email_domain: email.split('@')[1] },
    });
  }, [track]);

  const trackPasswordResetCompleted = useCallback(() => {
    track({
      event_name: AUTH_EVENTS.PASSWORD_RESET_COMPLETED,
      event_category: 'auth',
      properties: {},
    });
  }, [track]);

  // ===== EMAIL VERIFICATION =====

  const trackEmailVerified = useCallback(() => {
    track({
      event_name: AUTH_EVENTS.EMAIL_VERIFIED,
      event_category: 'auth',
      properties: {},
    });
  }, [track]);

  // ===== ONBOARDING =====

  const trackOnboardingStarted = useCallback(() => {
    track({
      event_name: ONBOARDING_EVENTS.ONBOARDING_STARTED,
      event_category: 'onboarding',
      properties: {},
    });
  }, [track]);

  const trackOnboardingStepCompleted = useCallback((props: OnboardingStepProps) => {
    track({
      event_name: ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED,
      event_category: 'onboarding',
      properties: props,
    });
  }, [track]);

  const trackOnboardingStepSkipped = useCallback((props: OnboardingStepProps) => {
    track({
      event_name: ONBOARDING_EVENTS.ONBOARDING_STEP_SKIPPED,
      event_category: 'onboarding',
      properties: props,
    });
  }, [track]);

  const trackOnboardingCompleted = useCallback((totalTimeSeconds: number) => {
    track({
      event_name: ONBOARDING_EVENTS.ONBOARDING_COMPLETED,
      event_category: 'onboarding',
      properties: { total_time_seconds: totalTimeSeconds },
    });
  }, [track]);

  const trackRoleSelected = useCallback((props: RoleSelectedProps) => {
    track({
      event_name: ONBOARDING_EVENTS.ROLE_SELECTED,
      event_category: 'onboarding',
      properties: props,
    });
  }, [track]);

  return {
    // Signup
    trackSignupStarted,
    trackSignupCompleted,
    trackSignupFailed,

    // Login
    trackLogin,
    trackLoginFailed,
    trackLogout,

    // OAuth
    trackOAuthStarted,
    trackOAuthCompleted,

    // Password
    trackPasswordResetRequested,
    trackPasswordResetCompleted,

    // Email
    trackEmailVerified,

    // Onboarding
    trackOnboardingStarted,
    trackOnboardingStepCompleted,
    trackOnboardingStepSkipped,
    trackOnboardingCompleted,
    trackRoleSelected,
  };
}
