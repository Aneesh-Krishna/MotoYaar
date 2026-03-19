"use client";

import { ArrowLeft, X } from "lucide-react";

interface StepWizardProps {
  steps: string[];
  currentStep: number; // 0-indexed
  children: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
}

export function StepWizard({
  steps,
  currentStep,
  children,
  onBack,
  onClose,
}: StepWizardProps) {
  const totalSteps = steps.length;
  const progressPercent = (currentStep / totalSteps) * 100;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        <button
          onClick={isFirstStep ? onClose : onBack}
          className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
          aria-label={isFirstStep ? "Close" : "Go back"}
        >
          {isFirstStep ? <X size={22} /> : <ArrowLeft size={22} />}
        </button>

        <span className="flex-1 text-center text-sm font-medium text-gray-700">
          Step {currentStep + 1} of {totalSteps}
        </span>

        {/* Spacer to keep label centered */}
        <div className="w-8" />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step label */}
      <div className="px-4 pt-4 pb-0">
        <h2 className="text-lg font-semibold text-gray-900">{steps[currentStep]}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
    </div>
  );
}
