import { useState } from "react";
import { changeOwnPassword } from "../services/authApi";
import { extractErrorMessage } from "../services/client";

export function useChangePassword() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const save = async () => {
        setError(null);
        setSaved(false);

        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("New password and confirmation don't match");
            return;
        }

        setSaving(true);
        try {
            await changeOwnPassword(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setSaved(true);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return {
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        saving, error, saved, save
    };
}
