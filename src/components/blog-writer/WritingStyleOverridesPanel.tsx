 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type {
  WritingStyleOverrides,
  ConclusionStyle,
  EngagementStyle,
  PersonalityStyle,
} from "@/types/blog-generation";

const MAX_CUSTOM_INSTRUCTIONS = 2000;
const FORMALITY_MIN = 1;
const FORMALITY_MAX = 10;

type Preset = "casual" | "balanced" | "professional" | "formal";

function clampFormality(value?: number) {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.min(FORMALITY_MAX, Math.max(FORMALITY_MIN, value));
}

function countActive(overrides: WritingStyleOverrides | null) {
  if (!overrides) return 0;
  return Object.entries(overrides).reduce((count, [, value]) => {
    if (value === undefined) return count;
    if (typeof value === "string" && value.length === 0) return count;
    return count + 1;
  }, 0);
}

export interface WritingStyleOverridesPanelProps {
  onChange: (overrides: WritingStyleOverrides | null) => void;
  defaultValues?: WritingStyleOverrides;
}

export default function WritingStyleOverridesPanel({
  onChange,
  defaultValues,
}: WritingStyleOverridesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formalityLevel, setFormalityLevel] = useState<number | undefined>(
    clampFormality(defaultValues?.formality_level)
  );
  const [useContractions, setUseContractions] = useState<boolean | undefined>(
    defaultValues?.use_contractions
  );
  const [conclusionStyle, setConclusionStyle] = useState<ConclusionStyle | "">(
    (defaultValues?.conclusion_style as ConclusionStyle) || ""
  );
  const [engagementStyle, setEngagementStyle] = useState<EngagementStyle | "">(
    (defaultValues?.engagement_style as EngagementStyle) || ""
  );
  const [personality, setPersonality] = useState<PersonalityStyle | "">(
    (defaultValues?.personality as PersonalityStyle) || ""
  );
  const [customInstructions, setCustomInstructions] = useState<string>(
    defaultValues?.custom_instructions || ""
  );

  // Debounce custom instructions to avoid spamming parent on every keystroke
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const buildOverrides = useMemo<() => WritingStyleOverrides | null>(() => {
    return () => {
      const overrides: WritingStyleOverrides = {};
      const clampedFormality = clampFormality(formalityLevel);
      if (clampedFormality !== undefined) {
        overrides.formality_level = clampedFormality;
      }
      if (useContractions !== undefined) {
        overrides.use_contractions = useContractions;
      }
      if (conclusionStyle) {
        overrides.conclusion_style = conclusionStyle;
      }
      if (engagementStyle) {
        overrides.engagement_style = engagementStyle;
      }
      if (personality) {
        overrides.personality = personality;
      }
      if (customInstructions.trim().length > 0) {
        overrides.custom_instructions = customInstructions.trim().slice(
          0,
          MAX_CUSTOM_INSTRUCTIONS
        );
      }

      return Object.keys(overrides).length > 0 ? overrides : null;
    };
  }, [
    formalityLevel,
    useContractions,
    conclusionStyle,
    engagementStyle,
    personality,
    customInstructions,
  ]);

  const emitOverrides = (next: WritingStyleOverrides | null) => {
    onChange(next);
  };

  const syncOverrides = () => {
    const next = buildOverrides();
    emitOverrides(next);
  };

  useEffect(() => {
    syncOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formalityLevel,
    useContractions,
    conclusionStyle,
    engagementStyle,
    personality,
  ]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(syncOverrides, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customInstructions]);

  const handlePreset = (preset: Preset) => {
    switch (preset) {
      case "casual":
        setFormalityLevel(3);
        setUseContractions(true);
        setEngagementStyle("conversational");
        setPersonality("friendly");
        break;
      case "balanced":
        setFormalityLevel(6);
        setUseContractions(true);
        setEngagementStyle("conversational");
        setPersonality("friendly");
        break;
      case "professional":
        setFormalityLevel(8);
        setUseContractions(false);
        setEngagementStyle("professional");
        setPersonality("authoritative");
        break;
      case "formal":
        setFormalityLevel(10);
        setUseContractions(false);
        setEngagementStyle("authoritative");
        setPersonality("authoritative");
        break;
    }
    syncOverrides();
  };

  const clearOverrides = () => {
    setFormalityLevel(undefined);
    setUseContractions(undefined);
    setConclusionStyle("");
    setEngagementStyle("");
    setPersonality("");
    setCustomInstructions("");
    emitOverrides(null);
  };

  const activeOverrides = countActive(buildOverrides());
  const isFormalitySet = formalityLevel !== undefined;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Customize Writing Style (Optional)
          </span>
          {activeOverrides > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {activeOverrides} override{activeOverrides === 1 ? "" : "s"} active
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Quick Presets
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["casual", "balanced", "professional", "formal"] as Preset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Formality Level: {isFormalitySet ? formalityLevel : "Default"}
            </label>
            <input
              type="range"
              min={FORMALITY_MIN}
              max={FORMALITY_MAX}
              value={formalityLevel ?? FORMALITY_MIN}
              onChange={(e) =>
                setFormalityLevel(clampFormality(parseInt(e.target.value, 10)))
              }
              className="mt-2 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Casual</span>
              <span>Formal</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Use contractions
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                (it's, don't, can't)
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={useContractions ?? false}
                onChange={(e) => setUseContractions(e.target.checked)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Conclusion Style
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                value={conclusionStyle}
                onChange={(e) =>
                  setConclusionStyle((e.target.value || "") as ConclusionStyle | "")
                }
              >
                <option value="">Use default</option>
                <option value="natural_wrap_up">Natural Wrap-up</option>
                <option value="summary">Summary</option>
                <option value="call_to_action">Call-to-Action</option>
                <option value="open_ended">Open-ended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Engagement Style
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                value={engagementStyle}
                onChange={(e) =>
                  setEngagementStyle(
                    (e.target.value || "") as EngagementStyle | ""
                  )
                }
              >
                <option value="">Use default</option>
                <option value="conversational">Conversational</option>
                <option value="professional">Professional</option>
                <option value="authoritative">Authoritative</option>
                <option value="analytical">Analytical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Personality
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={personality}
              onChange={(e) =>
                setPersonality((e.target.value || "") as PersonalityStyle | "")
              }
            >
              <option value="">Use default</option>
              <option value="friendly">Friendly</option>
              <option value="authoritative">Authoritative</option>
              <option value="analytical">Analytical</option>
              <option value="conversational">Conversational</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Custom Instructions for This Blog
            </label>
            <textarea
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              rows={3}
              maxLength={MAX_CUSTOM_INSTRUCTIONS}
              value={customInstructions}
              onChange={(e) =>
                setCustomInstructions(e.target.value.slice(0, MAX_CUSTOM_INSTRUCTIONS))
              }
              placeholder="Add specific instructions for this blog only..."
            />
            <div className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
              {customInstructions.length} / {MAX_CUSTOM_INSTRUCTIONS} characters
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearOverrides}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
            >
              Clear overrides
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

