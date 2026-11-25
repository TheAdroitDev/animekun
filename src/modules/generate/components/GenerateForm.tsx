"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { GenerateError, useGenerate } from "../queries/use-generate";
import type { ResolvedRecommendation } from "../types";
import { PROMPT_MAX_LENGTH, PROMPT_MIN_LENGTH } from "../validations/generate-schema";
import { GenerateResults } from "./GenerateResults";

interface GenerateFormProps {
    initialPrompt: string;
    initialRemaining: number;
    dailyLimit: number;
}

/** Prompt box + submit (step 8.5); loading state and results in GenerateResults (8.6). */
export function GenerateForm({ initialPrompt, initialRemaining, dailyLimit }: GenerateFormProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [remaining, setRemaining] = useState(initialRemaining);
    const [results, setResults] = useState<ResolvedRecommendation[] | null>(null);
    const generate = useGenerate();

    const trimmedLength = prompt.trim().length;
    const outOfTries = remaining <= 0;
    const canSubmit = trimmedLength >= PROMPT_MIN_LENGTH && !generate.isPending && !outOfTries;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        try {
            const data = await generate.mutateAsync(prompt.trim());
            setResults(data.recommendations);
            setRemaining(data.remaining);
        } catch (error) {
            if (error instanceof GenerateError && error.remaining !== null) {
                setRemaining(error.remaining);
            }
        }
    };

    const errorMessage = generate.error instanceof Error ? generate.error.message : null;

    return (
        <div className="gen-form-wrap">
            <form className="gen-form" onSubmit={handleSubmit}>
                <label htmlFor="gen-prompt" className="gen-form-label">
                    What do you want to watch?
                </label>
                <textarea
                    id="gen-prompt"
                    className="gen-form-textarea"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    maxLength={PROMPT_MAX_LENGTH}
                    rows={4}
                    placeholder="e.g. Anime like Death Note but funnier"
                    disabled={generate.isPending}
                    aria-describedby="gen-prompt-count gen-remaining"
                />

                <div className="gen-form-footer">
                    <span id="gen-prompt-count" className="gen-form-count">
                        {prompt.length}/{PROMPT_MAX_LENGTH}
                    </span>
                    <span id="gen-remaining" className={`gen-form-remaining${outOfTries ? " gen-form-remaining--empty" : ""}`}>
                        {outOfTries
                            ? "No requests left today · resets at 00:00 UTC"
                            : `${remaining} of ${dailyLimit} left today`}
                    </span>
                    <button type="submit" className="gen-form-submit" disabled={!canSubmit}>
                        {generate.isPending ? (
                            <Loader2 size={16} className="gen-form-spinner" aria-hidden="true" />
                        ) : (
                            <Sparkles size={16} aria-hidden="true" />
                        )}
                        <span>{generate.isPending ? "Finding anime…" : "Find anime"}</span>
                    </button>
                </div>
            </form>

            <GenerateResults isPending={generate.isPending} results={results} errorMessage={errorMessage} />
        </div>
    );
}
