interface MockStatement {
  bind: (...args: unknown[]) => MockStatement;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
  run: () => Promise<{ success: boolean }>;
}

interface MockDbConfig {
  first?: Record<string, unknown | null>;
  all?: Record<string, unknown[]>;
  run?: Record<string, { success: boolean }>;
}

export function createMockDb(config: MockDbConfig = {}) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];

  const createStatement = (sql: string): MockStatement => {
    const stmt: MockStatement = {
      bind(...args: unknown[]) {
        calls.push({ sql, params: args });
        return stmt;
      },
      async first<T = unknown>(): Promise<T | null> {
        const key = Object.keys(config.first ?? {}).find((k) => sql.includes(k));
        return (key ? config.first![key] : null) as T | null;
      },
      async all<T = unknown>(): Promise<{ results: T[] }> {
        const key = Object.keys(config.all ?? {}).find((k) => sql.includes(k));
        return { results: (key ? config.all![key] : []) as T[] };
      },
      async run(): Promise<{ success: boolean }> {
        const key = Object.keys(config.run ?? {}).find((k) => sql.includes(k));
        return key ? config.run![key]! : { success: true };
      },
    };
    return stmt;
  };

  const db = {
    prepare: (sql: string) => createStatement(sql),
    batch: async (stmts: MockStatement[]) => {
      const results = [];
      for (const stmt of stmts) {
        const allResult = await stmt.all();
        if (allResult.results.length > 0) {
          results.push({ ...allResult, success: true });
        } else {
          const firstResult = await stmt.first();
          results.push({
            results: firstResult != null ? [firstResult] : [],
            success: true,
          });
        }
      }
      return results;
    },
  };

  return { db: db as unknown as D1Database, calls };
}
