import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'blocked';

interface Table {
  id: string;
  label: string;
  min_capacity: number | null;
  max_capacity: number | null;
  status: TableStatus;
}

interface FloorPlanDetail {
  id: string;
  name: string;
  is_active: number;
  tables: Table[];
}

interface FloorPlanSummary {
  id: string;
  name: string;
  is_active: number;
  table_count: number;
}

const STATUS_CYCLE: TableStatus[] = ['available', 'occupied', 'reserved', 'blocked'];

const STATUS_STYLES: Record<TableStatus, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  reserved: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  occupied: 'bg-red-100 text-red-800 border-red-200',
  blocked: 'bg-stone-100 text-stone-500 border-stone-200',
};

const STATUS_DOT: Record<TableStatus, string> = {
  available: 'bg-green-500',
  reserved: 'bg-yellow-500',
  occupied: 'bg-red-500',
  blocked: 'bg-stone-400',
};

export default function FloorPlan() {
  const { apiFetch } = useApi();

  const [floorPlans, setFloorPlans] = useState<FloorPlanSummary[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FloorPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New floor plan form
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Add table form
  const [showAddTableForm, setShowAddTableForm] = useState(false);
  const [tableLabel, setTableLabel] = useState('');
  const [tableMinCap, setTableMinCap] = useState('');
  const [tableMaxCap, setTableMaxCap] = useState('');
  const [savingTable, setSavingTable] = useState(false);

  const fetchFloorPlans = useCallback(async () => {
    try {
      const res = await apiFetch('/floor-plans');
      const typed = res as { data?: FloorPlanSummary[] };
      setFloorPlans(typed.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load floor plans');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const fetchPlanDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      try {
        const res = await apiFetch(`/floor-plans/${id}`);
        const typed = res as { data?: FloorPlanDetail };
        if (typed.data) {
          setSelectedPlan(typed.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load floor plan details');
      } finally {
        setLoadingDetail(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    fetchFloorPlans();
  }, [fetchFloorPlans]);

  const handleSelectPlan = (fp: FloorPlanSummary) => {
    if (selectedPlan?.id === fp.id) {
      setSelectedPlan(null);
      setShowAddTableForm(false);
    } else {
      setShowAddTableForm(false);
      fetchPlanDetail(fp.id);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    setSavingPlan(true);
    try {
      await apiFetch('/floor-plans', {
        method: 'POST',
        body: JSON.stringify({ name: newPlanName.trim() }),
      });
      setNewPlanName('');
      setShowNewPlanForm(false);
      await fetchFloorPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create floor plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await apiFetch(`/floor-plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: 1 }),
      });
      await fetchFloorPlans();
      if (selectedPlan?.id === id) {
        await fetchPlanDetail(id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set active floor plan');
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !tableLabel.trim()) return;
    setSavingTable(true);
    try {
      await apiFetch(`/floor-plans/${selectedPlan.id}/tables`, {
        method: 'POST',
        body: JSON.stringify({
          label: tableLabel.trim(),
          min_capacity: tableMinCap ? parseInt(tableMinCap, 10) : null,
          max_capacity: tableMaxCap ? parseInt(tableMaxCap, 10) : null,
        }),
      });
      setTableLabel('');
      setTableMinCap('');
      setTableMaxCap('');
      setShowAddTableForm(false);
      await fetchPlanDetail(selectedPlan.id);
      await fetchFloorPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add table');
    } finally {
      setSavingTable(false);
    }
  };

  const handleCycleStatus = async (table: Table) => {
    const currentIndex = STATUS_CYCLE.indexOf(table.status);
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length] as TableStatus;
    if (!selectedPlan) return;
    // Optimistic update
    setSelectedPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tables: prev.tables.map((t): Table =>
          t.id === table.id ? { ...t, status: nextStatus } : t,
        ),
      };
    });
    try {
      await apiFetch(`/tables/${table.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update table status');
      // Revert on error
      await fetchPlanDetail(selectedPlan.id);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!selectedPlan) return;
    // Optimistic update
    setSelectedPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tables: prev.tables.filter((t) => t.id !== tableId),
      };
    });
    try {
      await apiFetch(`/tables/${tableId}`, { method: 'DELETE' });
      await fetchFloorPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete table');
      await fetchPlanDetail(selectedPlan.id);
    }
  };

  if (loading) {
    return <div className="text-stone-400 p-6">Loading floor plans...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Floor Plans</h1>
        <button
          onClick={() => {
            setShowNewPlanForm((v) => !v);
            setNewPlanName('');
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-lg hover:bg-stone-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          New Floor Plan
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* New floor plan inline form */}
      {showNewPlanForm && (
        <form
          onSubmit={handleCreatePlan}
          className="bg-stone-50 border border-stone-200 rounded-lg p-4 flex items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600 mb-1">Floor Plan Name</label>
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="e.g. Main Dining Room"
              autoFocus
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingPlan || !newPlanName.trim()}
            className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-md hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingPlan ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setShowNewPlanForm(false)}
            className="px-4 py-2 border border-stone-300 text-stone-600 text-sm font-medium rounded-md hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Floor plan cards row */}
      {floorPlans.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No floor plans configured.</p>
          <p className="text-sm mt-1">Create one above to get started.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {floorPlans.map((fp) => {
            const isSelected = selectedPlan?.id === fp.id;
            const isActive = fp.is_active === 1;
            return (
              <button
                key={fp.id}
                onClick={() => handleSelectPlan(fp)}
                className={`flex flex-col items-start gap-1.5 px-4 py-3 rounded-xl border-2 text-left transition-all min-w-[160px] ${
                  isSelected
                    ? 'border-stone-800 bg-stone-800 text-white shadow-md'
                    : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="font-semibold text-sm truncate">{fp.name}</span>
                  {isActive && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                        isSelected ? 'bg-green-400 text-green-900' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      Active
                    </span>
                  )}
                </div>
                <span className={`text-xs ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                  {fp.table_count} {fp.table_count === 1 ? 'table' : 'tables'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected floor plan detail */}
      {selectedPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-stone-900">{selectedPlan.name}</h2>
              {selectedPlan.is_active === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedPlan.is_active !== 1 && (
                <button
                  onClick={() => handleSetActive(selectedPlan.id)}
                  className="px-3 py-1.5 text-sm font-medium border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Set Active
                </button>
              )}
              <button
                onClick={() => setShowAddTableForm((v) => !v)}
                className="px-3 py-1.5 text-sm font-medium bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
              >
                + Add Table
              </button>
            </div>
          </div>

          {/* Add table form */}
          {showAddTableForm && (
            <form
              onSubmit={handleAddTable}
              className="bg-stone-50 border border-stone-200 rounded-lg p-4 flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  placeholder="e.g. T1, Bar 2"
                  autoFocus
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-stone-600 mb-1">Min Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={tableMinCap}
                  onChange={(e) => setTableMinCap(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-stone-600 mb-1">Max Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={tableMaxCap}
                  onChange={(e) => setTableMaxCap(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingTable || !tableLabel.trim()}
                className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-md hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingTable ? 'Adding…' : 'Add Table'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddTableForm(false)}
                className="px-4 py-2 border border-stone-300 text-stone-600 text-sm font-medium rounded-md hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Table grid */}
          {loadingDetail ? (
            <div className="text-stone-400 text-sm py-4">Loading tables…</div>
          ) : selectedPlan.tables.length === 0 ? (
            <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
              <p>No tables yet.</p>
              <p className="text-sm mt-1">Click "+ Add Table" to create the first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {selectedPlan.tables.map((table) => {
                const status = (table.status ?? 'available') as TableStatus;
                return (
                  <div
                    key={table.id}
                    className={`relative rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 cursor-pointer select-none transition-all hover:shadow-md active:scale-95 ${STATUS_STYLES[status]}`}
                    onClick={() => handleCycleStatus(table)}
                    role="button"
                    aria-label={`Table ${table.label}, status ${status}. Click to change status.`}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(table.id);
                      }}
                      aria-label={`Delete table ${table.label}`}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-white/60 hover:bg-white text-stone-400 hover:text-red-500 text-xs font-bold transition-colors"
                    >
                      ×
                    </button>

                    <span className="font-bold text-base leading-none">{table.label}</span>

                    {/* Capacity */}
                    {(table.min_capacity != null || table.max_capacity != null) && (
                      <span className="text-xs opacity-70">
                        {table.min_capacity != null && table.max_capacity != null
                          ? `${table.min_capacity}–${table.max_capacity}`
                          : table.max_capacity != null
                            ? `up to ${table.max_capacity}`
                            : `min ${table.min_capacity}`}
                      </span>
                    )}

                    {/* Status badge */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                      <span className="text-xs font-medium capitalize">{status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
