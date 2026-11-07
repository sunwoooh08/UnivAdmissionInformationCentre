import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS: string[] = [
  `CREATE TABLE admissions (
     id TEXT PRIMARY KEY,
     key TEXT NOT NULL UNIQUE,
     data TEXT NOT NULL,
     published INTEGER NOT NULL DEFAULT 0,
     hidden INTEGER NOT NULL DEFAULT 0,
     missing TEXT NOT NULL DEFAULT '[]',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE revisions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     admission_id TEXT NOT NULL,
     data TEXT NOT NULL,
     at TEXT NOT NULL,
     run_id TEXT,
     collector TEXT
   );
   CREATE INDEX revisions_admission ON revisions(admission_id, id);
   CREATE TABLE ingest_log (
     id TEXT PRIMARY KEY,
     run_id TEXT NOT NULL,
     collector TEXT NOT NULL,
     at TEXT NOT NULL,
     key TEXT NOT NULL,
     admission_id TEXT,
     outcome TEXT NOT NULL,
     messages TEXT NOT NULL
   );
   CREATE INDEX ingest_log_at ON ingest_log(at);
   CREATE TABLE reports (
     id TEXT PRIMARY KEY,
     admission_id TEXT NOT NULL,
     message TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'open',
     created_at TEXT NOT NULL,
     resolved_at TEXT
   );`,
];

/** DATA_DIR/uaic.db (SQLite). 시작할 때 필요한 마이그레이션을 적용한다. */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  readonly db: DatabaseSync;

  constructor() {
    const dir = process.env.DATA_DIR ?? join(process.cwd(), 'data');
    mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(join(dir, 'uaic.db'));
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const { user_version: version } = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
    for (let v = version; v < MIGRATIONS.length; v++) {
      this.transaction(() => {
        this.db.exec(MIGRATIONS[v] ?? '');
        this.db.exec(`PRAGMA user_version = ${v + 1}`);
      });
      this.logger.log(`Applied migration ${v + 1}`);
    }
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  onModuleDestroy() {
    this.db.close();
  }
}
