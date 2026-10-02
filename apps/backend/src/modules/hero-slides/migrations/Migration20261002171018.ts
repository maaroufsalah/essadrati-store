import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261002171018 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "hero_slide" ("id" text not null, "active" boolean not null default true, "rank" integer not null default 0, "image_desktop" jsonb null, "image_mobile" jsonb null, "title" jsonb not null, "subtitle" jsonb not null, "cta_label" jsonb not null, "link" jsonb null, "text_align" text check ("text_align" in ('start', 'center', 'end')) not null default 'start', "overlay" integer not null default 30, "duration_seconds" integer not null default 6, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hero_slide_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_hero_slide_deleted_at" ON "hero_slide" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hero_slide" cascade;`);
  }
}
