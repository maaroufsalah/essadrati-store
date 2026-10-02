import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261002090307 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "cod_city" drop constraint if exists "cod_city_slug_unique";`,
    );
    this.addSql(
      `alter table if exists "cod_zone" drop constraint if exists "cod_zone_code_unique";`,
    );
    this.addSql(
      `create table if not exists "cod_zone" ("id" text not null, "code" text not null, "name" jsonb not null, "fee" real not null, "delivery_days_min" integer not null, "delivery_days_max" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cod_zone_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cod_zone_code_unique" ON "cod_zone" ("code") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cod_zone_deleted_at" ON "cod_zone" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "cod_city" ("id" text not null, "slug" text not null, "name" jsonb not null, "fee" real null, "delivery_days_min" integer null, "delivery_days_max" integer null, "is_active" boolean not null default true, "rank" integer not null default 0, "zone_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cod_city_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cod_city_slug_unique" ON "cod_city" ("slug") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cod_city_zone_id" ON "cod_city" ("zone_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_cod_city_deleted_at" ON "cod_city" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "cod_city" add constraint "cod_city_zone_id_foreign" foreign key ("zone_id") references "cod_zone" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "cod_city" drop constraint if exists "cod_city_zone_id_foreign";`,
    );

    this.addSql(`drop table if exists "cod_zone" cascade;`);

    this.addSql(`drop table if exists "cod_city" cascade;`);
  }
}
