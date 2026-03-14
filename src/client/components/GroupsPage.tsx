import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, useFetch } from "../hooks/useApi";
import { InviteCodePanel } from "./InviteCodePanel";
import { MemberAvatar } from "./MemberAvatar";
import { Monster } from "./Monster";
import { randomLoadingMessage } from "../utils/personality";
import type { Group } from "../types";

interface GroupsPageProps {
  readonly token: string;
}

interface GroupMemberInfo {
  readonly id: string;
  readonly name: string;
  readonly is_admin: boolean;
}

const INPUT_CLASS =
  "w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/50 transition-all";

export function GroupsPage({ token }: GroupsPageProps) {
  const { post, del, get } = useApi(token);
  const { data: groups, loading, refresh } = useFetch<readonly Group[]>(token, "/api/groups");
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<readonly GroupMemberInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // Auto-repair orphaned group_members on first empty load
  const repairAttempted = useRef(false);
  useEffect(() => {
    if (loading || repairAttempted.current) return;
    if (groups && groups.length === 0) {
      repairAttempted.current = true;
      post<{ repaired: number }>("/api/groups/repair", {}).then((result) => {
        if (result.repaired > 0) refresh();
      }).catch(() => {});
    }
  }, [loading, groups, post, refresh]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await post<Group>("/api/groups", { name: name.trim() });
      setName("");
      setMode("list");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  }, [name, post, refresh]);

  const handleJoin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await post<Group>("/api/groups/join", { invite_code: inviteCode.trim() });
      setInviteCode("");
      setMode("list");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join group");
    } finally {
      setSubmitting(false);
    }
  }, [inviteCode, post, refresh]);

  const handleExpand = useCallback(async (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
      return;
    }
    setExpandedGroup(groupId);
    setMembersLoading(true);
    try {
      const members = await get<readonly GroupMemberInfo[]>(`/api/groups/${groupId}/members`);
      setGroupMembers(members);
    } catch {
      setGroupMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [expandedGroup, get]);

  const handleLeave = useCallback(async (groupId: string) => {
    try {
      await del<{ success: boolean }>(`/api/groups/${groupId}/leave`);
      setConfirmLeave(null);
      setExpandedGroup(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
    }
  }, [del, refresh]);

  const handleRemoveMember = useCallback(async (groupId: string, memberId: string) => {
    try {
      await del<{ success: boolean }>(`/api/groups/${groupId}/members/${memberId}`);
      setConfirmRemove(null);
      // Refresh group members
      const members = await get<readonly GroupMemberInfo[]>(`/api/groups/${groupId}/members`);
      setGroupMembers(members);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }, [del, get, refresh]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-950 flex flex-col items-center justify-center gap-4 pb-20">
        <Monster variant="bored" size={48} />
        <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-950 pb-24">
      <header className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/50 px-4 py-3">
        <h1 className="font-display text-xl font-black text-coral-500">Groups</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        {mode === "list" && (
          <div className="flex gap-2">
            <button
              onClick={() => { setMode("create"); setError(null); }}
              className="flex-1 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors active:scale-[0.98]"
            >
              Create Group
            </button>
            <button
              onClick={() => { setMode("join"); setError(null); }}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-colors active:scale-[0.98]"
            >
              Join Group
            </button>
          </div>
        )}

        {/* Create form */}
        {mode === "create" && (
          <form onSubmit={handleCreate} className="bg-stone-900 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Create a Group</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              maxLength={50}
              autoFocus
              className={INPUT_CLASS}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="flex-1 py-2.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("list"); setName(""); setError(null); }}
                className="px-4 py-2.5 text-stone-500 hover:text-stone-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Join form */}
        {mode === "join" && (
          <form onSubmit={handleJoin} className="bg-stone-900 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Join a Group</h2>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              autoComplete="off"
              autoFocus
              className={INPUT_CLASS}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !inviteCode.trim()}
                className="flex-1 py-2.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
              >
                {submitting ? "Joining..." : "Join"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("list"); setInviteCode(""); setError(null); }}
                className="px-4 py-2.5 text-stone-500 hover:text-stone-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Groups list */}
        {(!groups || groups.length === 0) && mode === "list" && (
          <div className="text-center py-12">
            <Monster variant="bored" size={48} />
            <p className="text-stone-400 text-sm mt-4">
              You're not in any groups yet
            </p>
            <p className="text-stone-600 text-xs mt-1">
              Create one or join with an invite code
            </p>
          </div>
        )}

        {groups?.map((group) => (
          <div key={group.id} className="bg-stone-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => handleExpand(group.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-50 font-bold">{group.name}</span>
                  {group.is_admin && (
                    <span className="text-[10px] font-bold uppercase bg-coral-500/20 text-coral-500 px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <span className="text-stone-500 text-sm">{group.member_count} {group.member_count === 1 ? "member" : "members"}</span>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className={`text-stone-600 transition-transform ${expandedGroup === group.id ? "rotate-90" : ""}`}
              >
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {expandedGroup === group.id && (
              <div className="border-t border-stone-800 px-4 py-3 space-y-3">
                {membersLoading ? (
                  <div className="shimmer h-8 rounded-lg" />
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 py-1">
                        <MemberAvatar name={m.name} size="sm" />
                        <span className="text-stone-300 text-sm flex-1">{m.name}</span>
                        {m.is_admin && (
                          <span className="text-[10px] font-bold uppercase bg-coral-500/20 text-coral-500 px-1.5 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                        {group.is_admin && !m.is_admin && (
                          confirmRemove === m.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleRemoveMember(group.id, m.id)}
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
                )}

                <div className="flex gap-2 pt-2 border-t border-stone-800">
                  {group.is_admin && (
                    <button
                      onClick={() => setShowInviteCode(group.id)}
                      className="text-sm text-coral-500 hover:text-coral-600 transition-colors"
                    >
                      Invite Code
                    </button>
                  )}
                  {confirmLeave === group.id ? (
                    <div className="flex gap-1 ml-auto">
                      <button
                        onClick={() => handleLeave(group.id)}
                        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm Leave
                      </button>
                      <button
                        onClick={() => setConfirmLeave(null)}
                        className="text-xs text-stone-500 px-2 py-1.5 hover:text-stone-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmLeave(group.id)}
                      className="ml-auto text-sm text-stone-600 hover:text-red-400 transition-colors"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showInviteCode && (
        <InviteCodePanel
          token={token}
          groupId={showInviteCode}
          onClose={() => setShowInviteCode(null)}
        />
      )}
    </div>
  );
}
