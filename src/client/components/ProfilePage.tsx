import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApi, useFetch } from "../hooks/useApi";
import { MemberAvatar } from "./MemberAvatar";
import { Monster } from "./Monster";
import { randomLoadingMessage } from "../utils/personality";
import type { Member, FamilyStatsData } from "../types";

interface ProfilePageProps {
  readonly token: string;
  readonly member: Member;
  readonly onLogout: () => void;
  readonly onNameChange: (name: string) => void;
}

interface MemberInfo {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
}

interface EnrichStatus {
  readonly missing_count: number;
}

interface EnrichDetail {
  readonly id: string;
  readonly name: string;
  readonly status: "enriched" | "skipped" | "failed";
  readonly matched_name?: string;
  readonly address?: string;
  readonly error?: string;
}

interface EnrichResult {
  readonly enriched: number;
  readonly skipped: number;
  readonly failed: number;
  readonly details: readonly EnrichDetail[];
}

export function ProfilePage({ token, member, onLogout, onNameChange }: ProfilePageProps) {
  const { put, post } = useApi(token);
  const { data: me, loading } = useFetch<MemberInfo>(token, "/api/auth/me");
  const { data: stats } = useFetch<FamilyStatsData>(token, "/api/stats");
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(member.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin enrichment state
  const [isAdmin, setIsAdmin] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState<EnrichStatus | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  useEffect(() => {
    if (me) setNameInput(me.name);
  }, [me]);

  // Check admin status by fetching enrich status (returns 403 for non-admins)
  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/enrich/status", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (res.ok) {
        const json = (await res.json()) as { data: EnrichStatus };
        setIsAdmin(true);
        setEnrichStatus(json.data);
      }
    }).catch(() => {
      // Not admin or API error — ignore
    });
  }, [token]);

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

  const handleEnrich = useCallback(async () => {
    setEnriching(true);
    setEnrichError(null);
    setEnrichResult(null);
    try {
      const result = await post<EnrichResult>("/api/admin/enrich", { limit: 50 });
      setEnrichResult(result);
      // Refresh the missing count
      setEnrichStatus({ missing_count: result.skipped + result.failed });
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  }, [post]);

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
        <Monster variant="bored" size={48} />
        <p className="text-stone-500 text-sm italic">{randomLoadingMessage()}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-950 pb-24">
      <header className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/50 px-4 py-3">
        <h1 className="font-display text-xl font-black text-coral-500">Profile</h1>
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
                      className="flex-1 bg-stone-800 text-stone-50 text-sm px-3 py-2 rounded-lg border border-stone-700 focus:border-coral-500 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setEditing(false);
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saving || !nameInput.trim()}
                      className="bg-coral-500 text-white text-sm font-bold px-3 py-2 rounded-lg hover:bg-coral-600 disabled:opacity-50 transition-colors"
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
                        className="ml-auto text-sm text-coral-500 hover:text-orange-300 transition-colors"
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

        {/* Your Stats Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Your Stats</h2>
            <button
              onClick={() => navigate("/stats")}
              className="text-xs text-coral-500 hover:text-orange-300 transition-colors"
            >
              View all stats
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-900 rounded-2xl p-4 text-center">
              <p className="font-display font-black text-2xl text-coral-500">
                {stats?.total_restaurants ?? "—"}
              </p>
              <p className="text-stone-500 text-xs mt-1 uppercase tracking-wider">Restaurants</p>
            </div>
            <div className="bg-stone-900 rounded-2xl p-4 text-center">
              <p className="font-display font-black text-2xl text-coral-500">
                {stats?.total_reviews ?? "—"}
              </p>
              <p className="text-stone-500 text-xs mt-1 uppercase tracking-wider">Reviews</p>
            </div>
            <div className="bg-stone-900 rounded-2xl p-4 text-center">
              <p className="font-display font-black text-2xl text-coral-500">
                {stats?.category_averages.food != null
                  ? stats.category_averages.food.toFixed(1)
                  : "—"}
              </p>
              <p className="text-stone-500 text-xs mt-1 uppercase tracking-wider">Avg Food</p>
            </div>
          </div>
        </section>

        {/* Admin Section — only visible to admins */}
        {isAdmin && enrichStatus != null && (
          <section>
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">Admin</h2>
            <div className="bg-stone-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-stone-300 text-sm font-medium">Enrich Restaurants</p>
                  <p className="text-stone-500 text-xs mt-0.5">
                    {enrichStatus.missing_count === 0
                      ? "All restaurants have location data"
                      : `${enrichStatus.missing_count} restaurant${enrichStatus.missing_count === 1 ? "" : "s"} missing coordinates`}
                  </p>
                </div>
                {enrichStatus.missing_count > 0 && (
                  <button
                    onClick={handleEnrich}
                    disabled={enriching}
                    className="bg-coral-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-coral-600 disabled:opacity-50 transition-colors"
                  >
                    {enriching ? "Enriching..." : "Enrich"}
                  </button>
                )}
              </div>

              {enrichError && (
                <p className="text-red-400 text-sm">{enrichError}</p>
              )}

              {enrichResult && (
                <div className="space-y-2">
                  <div className="flex gap-3 text-xs">
                    {enrichResult.enriched > 0 && (
                      <span className="text-green-400">
                        {enrichResult.enriched} enriched
                      </span>
                    )}
                    {enrichResult.skipped > 0 && (
                      <span className="text-stone-400">
                        {enrichResult.skipped} no match
                      </span>
                    )}
                    {enrichResult.failed > 0 && (
                      <span className="text-red-400">
                        {enrichResult.failed} failed
                      </span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {enrichResult.details.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 text-xs py-1"
                      >
                        <span
                          className={
                            d.status === "enriched"
                              ? "text-green-400"
                              : d.status === "failed"
                                ? "text-red-400"
                                : "text-stone-500"
                          }
                        >
                          {d.status === "enriched" ? "+" : d.status === "failed" ? "!" : "-"}
                        </span>
                        <span className="text-stone-300 truncate">{d.name}</span>
                        {d.address && (
                          <span className="text-stone-500 truncate ml-auto">{d.address}</span>
                        )}
                        {d.error && (
                          <span className="text-stone-500 truncate ml-auto">{d.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              className="w-full px-4 py-3 text-left text-stone-300 text-sm hover:text-coral-500 transition-colors"
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
          <Monster variant="bored" size={32} />
          <p className="text-stone-600 text-xs mt-2">eat sheet — the restaurant rater</p>
        </div>
      </div>
    </div>
  );
}
