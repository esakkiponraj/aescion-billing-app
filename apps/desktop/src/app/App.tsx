import React, { useState } from 'react';
import { useAuth } from '../store/authContext';
import { LandingPage } from '../components/landing/LandingPage';
import { SignInModal } from '../features/auth/SignInModal';
import { OnboardingWizard } from '../features/onboarding/OnboardingWizard';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading AESCION Commerce...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage
          onOpenSignIn={() => setIsSignInOpen(true)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
        />

        {isSignInOpen && (
          <SignInModal
            onClose={() => setIsSignInOpen(false)}
            onOpenOnboarding={() => {
              setIsSignInOpen(false);
              setIsOnboardingOpen(true);
            }}
          />
        )}

        {isOnboardingOpen && (
          <OnboardingWizard onClose={() => setIsOnboardingOpen(false)} />
        )}
      </>
    );
  }

  return <AppRoutes />;
};
