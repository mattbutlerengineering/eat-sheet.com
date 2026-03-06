import { useState, useCallback, useEffect } from "react";
import { useApi, useFetch } from "../hooks/useApi";
import { MemberAvatar } from "./MemberAvatar";
import { Slurms } from "./Slurms";
import { InviteCodePanel } from "./InviteCodePanel";
import { randomLoadingMessage } from "../utils/personality";
import type { Member } from "../types";

interface SettingsPageProps {
  readonly token: string;
  readonly member: Member;
  readonly onLogout: () => void;
  readonly onNameChange: (name: string) => void;
}

interface MemberInfo {
  readonly id: string;
  readonly family_id: string;
  readonly name: string;
  readonly is_admin: boolean;
  readonly email: string | null;
  readonly family_name: string | null;
}

interface FamilyMember {
  readonly id: string;
  readonly name: string;
}

export function SettingsPage({ token, member, onLogout, onNameChange }: SettingsPageProps) {
  const { put, del } = useApi(token);
  const { data: me, loading: meLoading } = useFetch<MemberInfo>(token, "/api/auth/me");
  const { data: members, loading: membersLoading, refresh: refreshMembers } = useFetch<readonly FamilyMember[]>(token, "/api/auth/members");

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(member.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

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

  const handleRemoveMember = useCallback(async (memberId: string) => {
    try {
      await del<{ success: boolean }>(`/api/auth/members/${memberId}`);
      setConfirmRemove(null);
      refreshMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }, [del, refreshMembers]);

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

  const loading = meLoading || membersLoading;

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4 pb-20">
        <Slurms variant="bored" size={48} />
        <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
      </div>
    );
  }

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
                      {member.is_admin && (
                        <span className="text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                          Admin
                        </span>
                      )}
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

        {/* Family Section */}
        <section>
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">Family</h2>
          <div className="bg-stone-900 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-50 font-bold">{me?.family_name ?? "Your Family"}</span>
              <span className="text-stone-500 text-sm">{members?.length ?? 0} members</span>
            </div>
            <div className="space-y-2">
              {members?.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-1">
                  <MemberAvatar name={m.name} size="sm" />
                  <span className="text-stone-300 text-sm flex-1">{m.name}</span>
                  {member.is_admin && m.id !== member.id && (
                    confirmRemove === m.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-xs text-stone-500 px-2 py-1 hover:text-stone-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(m.id)}
                        className="text-xs text-stone-600 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Admin Section */}
        {member.is_admin && (
          <section>
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">Admin</h2>
            <div className="bg-stone-900 rounded-2xl p-4">
              <button
                onClick={() => setShowInviteCode(true)}
                className="w-full text-left flex items-center justify-between py-1"
              >
                <span className="text-stone-300 text-sm">Manage Invite Code</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-stone-600" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </section>
        )}

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
          <p className="text-stone-600 text-xs mt-2">eat sheet — the family restaurant rater</p>
        </div>
      </div>

      {showInviteCode && (
        <InviteCodePanel token={token} onClose={() => setShowInviteCode(false)} />
      )}
    </div>
  );
}
