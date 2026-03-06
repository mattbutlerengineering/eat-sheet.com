import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApi, useFetch } from "../hooks/useApi";
import { MemberAvatar } from "./MemberAvatar";
import { Slurms } from "./Slurms";
import { randomLoadingMessage } from "../utils/personality";
import type { Member, Group } from "../types";

interface SettingsPageProps {
  readonly token: string;
  readonly member: Member;
  readonly onLogout: () => void;
  readonly onNameChange: (name: string) => void;
}

interface MemberInfo {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly groups: readonly Group[];
}

export function SettingsPage({ token, member, onLogout, onNameChange }: SettingsPageProps) {
  const { put } = useApi(token);
  const { data: me, loading } = useFetch<MemberInfo>(token, "/api/auth/me");
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(member.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) setNameInput(me.name);
  }, [me]);

  const handleSaveName = useCallback(async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await put<Member>("/api/auth/me", { name: trimmed });
      onNameChange(updated.name);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  }, [nameInput, put, onNameChange]);

  const handleClearCache = useCallback(async () => {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    window.location.reload();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4 pb-20">
        <Slurms variant="bored" size={48} />
        <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
      </div>
    );
  }

  const groups = me?.groups ?? [];

  return (
    <div className="min-h-dvh bg-stone-950 pb-24">
      <header className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/50 px-4 py-3">
        <h1 className="font-display text-xl font-black text-orange-500">Settings</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Profile Section */}
        <section>
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">Profile</h2>
          <div className="bg-stone-900 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <MemberAvatar name={me?.name ?? member.name} size="lg" />
              <div className="flex-1">
                {editing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={50}
                      className="flex-1 bg-stone-800 text-stone-50 text-sm px-3 py-2 rounded-lg border border-stone-700 focus:border-orange-500 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setEditing(false);
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saving || !nameInput.trim()}
                      className="bg-orange-500 text-white text-sm font-bold px-3 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {saving ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setNameInput(me?.name ?? member.name); }}
                      className="text-stone-500 hover:text-stone-300 text-sm px-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-stone-50 font-bold">{me?.name ?? member.name}</span>
                      <button
                        onClick={() => setEditing(true)}
                        className="ml-auto text-sm text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    {me?.email && (
                      <p className="text-stone-500 text-xs mt-0.5">{me.email}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </section>

        {/* Groups Section */}
        <section>
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">Groups</h2>
          <div className="bg-stone-900 rounded-2xl p-4 space-y-3">
            {groups.length === 0 ? (
              <p className="text-stone-500 text-sm">You're not in any groups yet</p>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-stone-50 font-medium text-sm">{g.name}</span>
                    {g.is_admin && (
                      <span className="ml-2 text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-stone-500 text-xs">{g.member_count} members</span>
                </div>
              ))
            )}
            <button
              onClick={() => navigate("/groups")}
              className="w-full text-left flex items-center justify-between pt-2 border-t border-stone-800"
            >
              <span className="text-orange-400 text-sm font-medium">Manage Groups</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-stone-600" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </section>

        {/* App Section */}
        <section>
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">App</h2>
          <div className="bg-stone-900 rounded-2xl divide-y divide-stone-800">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-stone-300 text-sm">Version</span>
              <span className="text-stone-500 text-sm">1.0.0</span>
            </div>
            <button
              onClick={handleClearCache}
              className="w-full px-4 py-3 text-left text-stone-300 text-sm hover:text-orange-400 transition-colors"
            >
              Clear Cache & Reload
            </button>
            <button
              onClick={onLogout}
              className="w-full px-4 py-3 text-left text-red-400 text-sm hover:text-red-300 transition-colors"
            >
              Log Out
            </button>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-4">
          <Slurms variant="bored" size={32} />
          <p className="text-stone-600 text-xs mt-2">eat sheet — the restaurant rater</p>
        </div>
      </div>
    </div>
  );
}
