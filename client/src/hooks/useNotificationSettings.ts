import { useEffect, useState } from "react";
import { getNotificationSettings, updateNotificationSettings, type NotificationSettings } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";

const initialSettings: NotificationSettings = { webhookUrl: null, notifyOnSuccess: true, notifyOnFailure: true };

export function useNotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettings>(initialSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                setSettings(await getNotificationSettings());
            } catch (err) {
                setError(extractErrorMessage(err));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const save = async () => {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            await updateNotificationSettings(settings);
            setSaved(true);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return { settings, setSettings, loading, saving, error, saved, save };
}
