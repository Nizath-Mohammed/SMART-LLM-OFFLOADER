import Database from 'better-sqlite3';

let db: Database.Database | null = null;

/**
 * Opens (or creates) the SQLite database at the given file path, runs schema
 * creation, enables WAL mode and foreign-key enforcement, then returns the
 * Database instance.
 *
 * Pass ":memory:" during tests for a fully isolated in-memory database.
 *
 * For on-disk paths: if the file is missing or unreadable the constructor will
 * throw; that error is caught, a descriptive message is printed to stderr, and
 * the process exits with code 1.
 */
export function initDatabase(filePath: string): Database.Database {
  // For in-memory databases we skip the file-access guard so tests can
  // call initDatabase(":memory:") freely.
  if (filePath !== ':memory:') {
    try {
      db = new Database(filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `[EdgeLLM] Fatal: unable to open database at "${filePath}": ${message}\n`
      );
      process.exit(1);
    }
  } else {
    db = new Database(':memory:');
  }

  // Enable Write-Ahead Logging for better concurrent read performance.
  db.pragma('journal_mode=WAL');

  // Enforce foreign-key constraints (SQLite disables them by default).
  db.pragma('foreign_keys=ON');

  // ── Schema ──────────────────────────────────────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        system_prompt TEXT NOT NULL DEFAULT '',
        model_ref     TEXT,
        status        TEXT NOT NULL DEFAULT 'idle'
                          CHECK(status IN ('idle', 'running', 'error')),
        created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id            TEXT PRIMARY KEY,
        agent_id      TEXT NOT NULL,
        prompt        TEXT NOT NULL,
        response      TEXT,
        error_message TEXT,
        status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        created_at    TEXT NOT NULL,
        started_at    TEXT,
        completed_at  TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_agent_id
        ON tasks(agent_id);

    CREATE INDEX IF NOT EXISTS idx_tasks_created_at
        ON tasks(agent_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS recommendations (
        id                        TEXT PRIMARY KEY,
        task_category             TEXT NOT NULL,
        task_complexity           TEXT NOT NULL,
        recommended_model         TEXT NOT NULL,
        recommended_quantization  TEXT,
        estimated_memory_mb       INTEGER NOT NULL,
        recommended_context_length INTEGER NOT NULL,
        execution_strategy        TEXT NOT NULL,
        compatibility_warnings    TEXT NOT NULL DEFAULT '[]',
        explanation               TEXT NOT NULL,
        confidence_level          TEXT NOT NULL,
        prompt                    TEXT NOT NULL,
        agent_id                  TEXT,
        created_at                TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recommendations_created_at
        ON recommendations(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_recommendations_agent_id
        ON recommendations(agent_id);

    CREATE TABLE IF NOT EXISTS executions (
        id             TEXT PRIMARY KEY,
        agent_id       TEXT,
        task_id        TEXT,
        model_name     TEXT NOT NULL,
        prompt         TEXT NOT NULL,
        system_prompt  TEXT,
        response       TEXT,
        status         TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        error_message  TEXT,
        duration_ms    INTEGER,
        prompt_tokens  INTEGER,
        eval_tokens    INTEGER,
        total_tokens   INTEGER,
        created_at     TEXT NOT NULL,
        completed_at   TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_executions_created_at
        ON executions(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_executions_agent_id
        ON executions(agent_id);

    -- ── VS4 Scheduler tables ──────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS scheduler_config (
        id              INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
        ram_budget_mb   INTEGER NOT NULL DEFAULT 6144,
        max_concurrency INTEGER NOT NULL DEFAULT 1,
        updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id               TEXT PRIMARY KEY,
        priority         TEXT NOT NULL
                             CHECK(priority IN ('low','normal','high','critical')),
        status           TEXT NOT NULL
                             CHECK(status IN ('queued','running','completed','cancelled','failed')),
        model_name       TEXT NOT NULL,
        estimated_ram_mb INTEGER NOT NULL,
        submitted_at     TEXT NOT NULL,
        started_at       TEXT,
        completed_at     TEXT,
        execution_id     TEXT,
        error_message    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status
        ON scheduled_tasks(status);

    CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_submitted_at
        ON scheduled_tasks(priority, submitted_at);

    -- ── VS4 Model Lifecycle tables ────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS model_last_used (
        model_name   TEXT PRIMARY KEY,
        last_used_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_lifecycle_events (
        id          TEXT PRIMARY KEY,
        model_name  TEXT NOT NULL,
        event_type  TEXT NOT NULL
                        CHECK(event_type IN ('loaded','unloaded','auto_unloaded','unload_blocked')),
        reason      TEXT NOT NULL,
        occurred_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_lifecycle_events_occurred_at
        ON model_lifecycle_events(occurred_at DESC);

    CREATE TABLE IF NOT EXISTS lifecycle_config (
        id                   INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
        auto_unload_enabled  INTEGER NOT NULL DEFAULT 0,
        idle_timeout_seconds INTEGER NOT NULL DEFAULT 300,
        updated_at           TEXT NOT NULL
    );

    -- ── VS4 Collaboration tables ──────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS collaboration_sessions (
        id              TEXT PRIMARY KEY,
        title           TEXT NOT NULL,
        parent_agent_id TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'active'
                            CHECK(status IN ('active','completed','failed')),
        created_at      TEXT NOT NULL,
        FOREIGN KEY (parent_agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
        id           TEXT PRIMARY KEY,
        session_id   TEXT NOT NULL,
        agent_id     TEXT NOT NULL,
        prompt       TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'queued'
                         CHECK(status IN ('queued','running','completed','cancelled','failed')),
        depth        INTEGER NOT NULL CHECK(depth >= 1 AND depth <= 3),
        depends_on   TEXT NOT NULL DEFAULT '[]',
        created_at   TEXT NOT NULL,
        completed_at TEXT,
        error_message TEXT,
        FOREIGN KEY (session_id) REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id)   REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_subtasks_session_id
        ON subtasks(session_id);

    CREATE TABLE IF NOT EXISTS agent_messages (
        id            TEXT PRIMARY KEY,
        session_id    TEXT NOT NULL,
        from_agent_id TEXT NOT NULL,
        to_agent_id   TEXT NOT NULL,
        content       TEXT NOT NULL,
        subtask_id    TEXT,
        sent_at       TEXT NOT NULL,
        FOREIGN KEY (session_id)    REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (to_agent_id)   REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id
        ON agent_messages(session_id, sent_at ASC);

    -- ── VS4 Benchmarking table ────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS benchmark_records (
        id                TEXT PRIMARY KEY,
        execution_id      TEXT NOT NULL,
        model_name        TEXT NOT NULL,
        duration_ms       INTEGER NOT NULL,
        tokens_per_second REAL,
        tps_data_source   TEXT NOT NULL
                              CHECK(tps_data_source IN ('measured','estimated','unavailable')),
        estimated_ram_mb  INTEGER,
        ram_data_source   TEXT NOT NULL
                              CHECK(ram_data_source IN ('measured','estimated','unavailable')),
        success           INTEGER NOT NULL,
        recorded_at       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_benchmark_records_model_name
        ON benchmark_records(model_name);

    CREATE INDEX IF NOT EXISTS idx_benchmark_records_recorded_at
        ON benchmark_records(recorded_at DESC);
  `);

  return db;
}

/**
 * Returns the already-initialised database singleton.
 *
 * Throws if `initDatabase` has not been called yet — callers should treat this
 * as a programming error (the application entry point must call initDatabase
 * before any route handler runs).
 */
export function getDatabase(): Database.Database {
  if (db === null) {
    throw new Error(
      '[EdgeLLM] Database has not been initialised. ' +
        'Call initDatabase(filePath) before calling getDatabase().'
    );
  }
  return db;
}

/** Resets the singleton for test isolation. Call before initDatabase(':memory:'). */
export function resetDatabase(): void {
  if (db !== null) {
    try { db.close(); } catch { /* ignore */ }
    db = null;
  }
}
