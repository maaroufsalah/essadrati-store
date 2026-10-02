import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261002171019 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "category_banner" ("id" text not null, "active" boolean not null default true, "rank" integer not null default 0, "image_desktop" jsonb null, "image_mobile" jsonb null, "title" jsonb not null, "tagline" jsonb not null, "cta_label" jsonb not null, "link" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_banner_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_category_banner_deleted_at" ON "category_banner" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "category_banner" cascade;`);
  }
}
