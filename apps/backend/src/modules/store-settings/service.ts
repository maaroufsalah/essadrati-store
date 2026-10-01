import type { Logger } from "@medusajs/framework/types";
import { MedusaError, MedusaService } from "@medusajs/framework/utils";
import { type PublicStoreSettings, type StoreSettings, toPublicStoreSettings } from "@nocido/types";
import { decryptSecret, encryptSecret } from "./lib/crypto";
import { hydrateSettings, type PasswordChange, toStoredData } from "./lib/settings";
import StoreSettingsRecord from "./models/store-settings-record";

export interface StoreSettingsModuleOptions {
  /** SETTINGS_ENCRYPTION_KEY: encrypts the SMTP password. */
  encryptionKey?: string;
}

interface InjectedDependencies {
  logger: Logger;
}

/** Raw row, used by the update workflow to roll back. */
export interface StoreSettingsSnapshot {
  id: string;
  data: Record<string, unknown>;
  smtp_password: string | null;
}

export default class StoreSettingsModuleService extends MedusaService({ StoreSettingsRecord }) {
  protected readonly logger_: Logger;
  protected readonly encryptionKey_: string | undefined;

  constructor(container: InjectedDependencies, options: StoreSettingsModuleOptions = {}) {
    // MedusaService expects the raw constructor arguments.
    // eslint-disable-next-line prefer-rest-params
    super(...(arguments as unknown as [InjectedDependencies]));
    this.logger_ = container.logger;
    this.encryptionKey_ = options.encryptionKey;
  }

  /** The current row, or null before the first save. */
  async getSnapshot(): Promise<StoreSettingsSnapshot | null> {
    const [record] = await this.listStoreSettingsRecords(
      {},
      { take: 1, order: { created_at: "ASC" } },
    );
    if (!record) return null;
    return {
      id: record.id,
      data: record.data ?? {},
      smtp_password: record.smtp_password,
    };
  }

  /** Full settings for the admin. Never fails: invalid data falls back to defaults. */
  async getSettings(): Promise<StoreSettings> {
    const snapshot = await this.getSnapshot();
    const { settings, issues } = hydrateSettings(snapshot?.data, Boolean(snapshot?.smtp_password));
    for (const issue of issues) {
      this.logger_.warn(
        `[store-settings] section "${issue.section}" reset to default: ${issue.message}`,
      );
    }
    return settings;
  }

  /** Settings for the public store API: no SMTP, no bank details. */
  async getPublicSettings(): Promise<PublicStoreSettings> {
    return toPublicStoreSettings(await this.getSettings());
  }

  /** Decrypted SMTP password, for the notification provider only. */
  async getSmtpPassword(): Promise<string | null> {
    const snapshot = await this.getSnapshot();
    if (!snapshot?.smtp_password) return null;
    return decryptSecret(snapshot.smtp_password, this.requireKey_());
  }

  /** Persists settings already merged and validated by `applyUpdate`. */
  async saveSettings(settings: StoreSettings, password: PasswordChange): Promise<StoreSettings> {
    const snapshot = await this.getSnapshot();
    const smtpPassword =
      password.action === "set"
        ? encryptSecret(password.value, this.requireKey_())
        : password.action === "clear"
          ? null
          : (snapshot?.smtp_password ?? null);

    const data = toStoredData(settings);
    if (snapshot) {
      await this.updateStoreSettingsRecords({ id: snapshot.id, data, smtp_password: smtpPassword });
    } else {
      await this.createStoreSettingsRecords({ data, smtp_password: smtpPassword });
    }
    return this.getSettings();
  }

  /** Puts a previous snapshot back (workflow compensation). */
  async restoreSnapshot(previous: StoreSettingsSnapshot | null): Promise<void> {
    const current = await this.getSnapshot();
    if (!previous) {
      if (current) await this.deleteStoreSettingsRecords(current.id);
      return;
    }
    await this.updateStoreSettingsRecords({
      id: previous.id,
      data: previous.data,
      smtp_password: previous.smtp_password,
    });
  }

  private requireKey_(): string {
    if (!this.encryptionKey_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SETTINGS_ENCRYPTION_KEY is not configured",
      );
    }
    return this.encryptionKey_;
  }
}
