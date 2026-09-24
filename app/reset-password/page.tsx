"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error ||
            "Unable to change your password."
        );
        return;
      }

      setSuccess(
        data?.message ||
          "Password changed successfully. Please sign in again."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (requestError) {
      console.error(
        "Password change request failed:",
        requestError
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f5f8fb",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow:
            "0 12px 40px rgba(0, 61, 112, 0.10)",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              margin: 0,
              color: "#003d70",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            Change Password
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#64748b",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            Update your staff account password.
            You will be signed out after the
            password is changed.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#f0fdf4",
              color: "#15803d",
              fontSize: "14px",
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="currentPassword"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Current Password
            </label>

            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              disabled={loading}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="newPassword"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              New Password
            </label>

            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              disabled={loading}
              required
              minLength={8}
              maxLength={128}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="confirmPassword"
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Confirm New Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              disabled={loading}
              required
              minLength={8}
              maxLength={128}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              marginBottom: "24px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#f8fafc",
              color: "#475569",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            Password must contain at least 8
            characters, including an uppercase letter,
            a number, and a special character.
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "8px",
              padding: "13px 16px",
              background: loading
                ? "#94a3b8"
                : "#003d70",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Changing Password..."
              : "Change Password"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.replace("/")}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "12px 16px",
            background: "#ffffff",
            color: "#475569",
            fontSize: "14px",
            fontWeight: 600,
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          Back to Sign In
        </button>
      </section>
    </main>
  );
}