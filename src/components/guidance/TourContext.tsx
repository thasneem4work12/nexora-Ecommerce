"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TOURS, type TourDefinition } from "./tour-definitions";

interface TourContextValue {
  activeTour: TourDefinition | null;
  currentStepIndex: number;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  isTourCompleted: (tourId: string) => boolean;
  replayTour: (tourId: string) => void;
  autoPromptTour: (tourId: string) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = useState(false);

  // Load completed tours from localStorage
  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem("nexora_completed_tours");
      if (stored) {
        setCompletedTours(JSON.parse(stored));
      }
    } catch {
      // Fallback if storage unavailable
    }
  }, []);

  const markCompleted = useCallback((tourId: string) => {
    setCompletedTours((prev) => {
      const updated = { ...prev, [tourId]: true };
      try {
        localStorage.setItem("nexora_completed_tours", JSON.stringify(updated));
      } catch {
        // Storage fallback
      }
      return updated;
    });
  }, []);

  const isTourCompleted = useCallback(
    (tourId: string) => Boolean(completedTours[tourId]),
    [completedTours]
  );

  const startTour = useCallback((tourId: string) => {
    const tour = TOURS[tourId];
    if (tour && tour.steps.length > 0) {
      setActiveTour(tour);
      setCurrentStepIndex(0);
    }
  }, []);

  const replayTour = useCallback((tourId: string) => {
    startTour(tourId);
  }, [startTour]);

  const autoPromptTour = useCallback(
    (tourId: string) => {
      if (!isClient) return;
      if (!completedTours[tourId]) {
        // Auto-prompt uncompleted tours on first visit after a slight delay
        const timer = setTimeout(() => {
          startTour(tourId);
        }, 800);
        return () => clearTimeout(timer);
      }
    },
    [isClient, completedTours, startTour]
  );

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      markCompleted(activeTour.id);
      setActiveTour(null);
      setCurrentStepIndex(0);
    }
  }, [activeTour, currentStepIndex, markCompleted]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    if (activeTour) {
      markCompleted(activeTour.id);
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, markCompleted]);

  const finishTour = useCallback(() => {
    if (activeTour) {
      markCompleted(activeTour.id);
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, markCompleted]);

  return (
    <TourContext.Provider
      value={{
        activeTour,
        currentStepIndex,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        isTourCompleted,
        replayTour,
        autoPromptTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
