import { MedusaService } from "@medusajs/framework/utils";
import { isRedirectPath, type RedirectRow, withRedirect } from "./lib";
import Redirect from "./models/redirect";

export default class RedirectsModuleService extends MedusaService({ Redirect }) {
  async listRows(): Promise<RedirectRow[]> {
    const records = await this.listRedirects({}, { take: null, order: { from_path: "ASC" } });
    return records.map((record) => ({ from: record.from_path, to: record.to_path }));
  }

  /** Adds `from -> to` and rewrites the table so no chain or loop remains. */
  async addRedirect(from: string, to: string): Promise<RedirectRow[]> {
    if (!isRedirectPath(from) || !isRedirectPath(to)) return this.listRows();
    const current = await this.listRedirects({}, { take: null });
    const next = withRedirect(
      current.map((record) => ({ from: record.from_path, to: record.to_path })),
      from,
      to,
    );
    const keep = new Map(next.map((row) => [row.from, row.to]));
    const stale = current.filter((record) => keep.get(record.from_path) !== record.to_path);
    if (stale.length > 0) await this.deleteRedirects(stale.map((record) => record.id));
    const existing = new Set(
      current.filter((record) => !stale.includes(record)).map((record) => record.from_path),
    );
    const added = next.filter((row) => !existing.has(row.from));
    if (added.length > 0) {
      await this.createRedirects(added.map((row) => ({ from_path: row.from, to_path: row.to })));
    }
    return this.listRows();
  }

  async removeRedirect(from: string): Promise<RedirectRow[]> {
    const [record] = await this.listRedirects({ from_path: from }, { take: 1 });
    if (record) await this.deleteRedirects(record.id);
    return this.listRows();
  }
}
