"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket, Bot, MessageSquare, Compass, PartyPopper,
  ChevronRight, ChevronLeft, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOnboarding, completeOnboardingStep } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { OnboardingState } from "@/lib/types";

const TOTAL_STEPS = 5;

const STEP_ICONS = [Rocket, Bot, MessageSquare, Compass, PartyPopper];

export function OnboardingWizard() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadOnboarding();
  }, []);

  async function loadOnboarding() {
    setLoading(true);
    try {
      const state = await getOnboarding();
      setOnboarding(state);
      setCurrentStep(state.current_step ?? 0);
    } catch {
      // If onboarding can't be loaded, don't show the wizard
      setDismissed(true);
    } finally {
      setLoading(false);
    }
  }

  async function markStep(step: number) {
    try {
      await completeOnboardingStep(step);
    } catch {
      // Non-critical, continue anyway
    }
  }

  function handleNext() {
    markStep(currentStep);
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleSkipStep() {
    markStep(currentStep);
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleDismiss() {
    // Mark all remaining steps as complete
    for (let i = currentStep; i < TOTAL_STEPS; i++) {
      markStep(i);
    }
    setDismissed(true);
  }

  function handleComplete() {
    markStep(TOTAL_STEPS - 1);
    setDismissed(true);
  }

  // Don't show if loading, already complete, or dismissed
  if (loading || dismissed || !onboarding || onboarding.is_complete) {
    return null;
  }

  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header with dismiss */}
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  i === currentStep
                    ? "bg-primary w-6"
                    : i < currentStep
                      ? "bg-primary/40"
                      : "bg-muted-foreground/20",
                )}
              />
            ))}
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip Setup
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 py-8">
          {currentStep === 0 && <StepWelcome />}
          {currentStep === 1 && <StepConnectAgent />}
          {currentStep === 2 && <StepSendMessage />}
          {currentStep === 3 && <StepExploreFeatures />}
          {currentStep === 4 && <StepComplete />}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 pb-6">
          {currentStep > 0 && currentStep < TOTAL_STEPS - 1 ? (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
              <Button variant="ghost" size="sm" onClick={handleSkipStep}>
                Skip
              </Button>
            )}

            {currentStep === 0 && (
              <Button size="sm" onClick={handleNext}>
                Get Started
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
              <Button size="sm" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {currentStep === TOTAL_STEPS - 1 && (
              <Button size="sm" onClick={handleComplete}>
                Start Using AgentHub
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold">Welcome to AgentHub</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Your multi-agent dashboard for connecting to, chatting with, and orchestrating
          autonomous AI agents. Let's get you set up in just a few steps.
        </p>
      </div>
    </div>
  );
}

function StepConnectAgent() {
  const router = useRouter();
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <Bot className="h-8 w-8 text-violet-500" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold">Connect Your First Agent</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Agents are the AI models you communicate through. Connect one via the Agents page
          to start chatting -- or skip this for now and explore first.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/agents")}
      >
        <Bot className="h-4 w-4 mr-1" />
        Go to Agents
      </Button>
    </div>
  );
}

function StepSendMessage() {
  const router = useRouter();
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-emerald-500" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold">Send a Message</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Start a conversation with one of your connected agents. You can have 1-on-1 chats
          or group discussions with multiple agents collaborating.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/")}
      >
        <MessageSquare className="h-4 w-4 mr-1" />
        Start a Chat
      </Button>
    </div>
  );
}

function StepExploreFeatures() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Compass className="h-8 w-8 text-amber-500" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold">Explore Features</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          AgentHub is packed with tools to help you orchestrate AI agents effectively.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 text-left">
        <FeatureItem
          title="Templates"
          description="Save and reuse conversation configurations"
        />
        <FeatureItem
          title="Workflows"
          description="Build multi-step agent pipelines visually"
        />
        <FeatureItem
          title="Arena"
          description="Compare agents head-to-head on the same prompts"
        />
      </div>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-2.5">
      <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

function StepComplete() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">&#127881;</span>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold">You're All Set!</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          You're ready to start using AgentHub. Connect agents, start conversations,
          and build powerful multi-agent workflows. Have fun!
        </p>
      </div>
    </div>
  );
}
