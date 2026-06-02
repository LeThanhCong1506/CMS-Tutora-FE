import { useCallback, useRef } from 'react';

/**
 * A hook that saves/loads form drafts to sessionStorage.
 * Used to preserve user input when API rejects submissions (e.g., banned words).
 * 
 * sessionStorage is used instead of localStorage because drafts should not
 * persist across browser sessions — only within the current tab.
 * 
 * @param draftKey - Unique key for this form (e.g., 'draft_aboutme')
 */
export function useFormDraft<T>(draftKey: string) {
    const keyRef = useRef(draftKey);
    keyRef.current = draftKey;

    /**
     * Save current form data as a draft.
     * Non-serializable values (File, Blob, etc.) are stripped automatically.
     */
    const saveDraft = useCallback((data: T) => {
        try {
            const serializable = JSON.parse(JSON.stringify(data, (_key, value) => {
                // Skip File/Blob objects — they can't be serialized
                if (value instanceof File || value instanceof Blob) {
                    return undefined;
                }
                return value;
            }));
            sessionStorage.setItem(keyRef.current, JSON.stringify(serializable));
        } catch (err) {
            console.warn('[useFormDraft] Failed to save draft:', err);
        }
    }, []);

    /**
     * Load draft from sessionStorage.
     * @returns The saved draft data, or null if none exists.
     */
    const loadDraft = useCallback((): T | null => {
        try {
            const raw = sessionStorage.getItem(keyRef.current);
            if (raw) {
                return JSON.parse(raw) as T;
            }
        } catch (err) {
            console.warn('[useFormDraft] Failed to load draft:', err);
        }
        return null;
    }, []);

    /**
     * Clear the draft (call after successful save).
     */
    const clearDraft = useCallback(() => {
        try {
            sessionStorage.removeItem(keyRef.current);
        } catch (err) {
            console.warn('[useFormDraft] Failed to clear draft:', err);
        }
    }, []);

    /**
     * Check if a draft exists.
     */
    const hasDraft = useCallback((): boolean => {
        return sessionStorage.getItem(keyRef.current) !== null;
    }, []);

    return { saveDraft, loadDraft, clearDraft, hasDraft };
}
