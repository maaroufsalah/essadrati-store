import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261002094332 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "cms_page" drop constraint if exists "cms_page_handle_unique";`,
    );
    this.addSql(
      `create table if not exists "cms_page" ("id" text not null, "handle" text not null, "title" jsonb not null, "content" jsonb not null, "seo" jsonb not null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "show_in_footer" boolean not null default false, "footer_rank" integer not null default 0, "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cms_page_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cms_page_handle_unique" ON "cms_page" ("handle") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cms_page_deleted_at" ON "cms_page" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cms_page" cascade;`);
  }
}
