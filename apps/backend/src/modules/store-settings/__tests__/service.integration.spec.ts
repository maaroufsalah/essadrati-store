/// <reference types="vitest/globals" />
import { moduleIntegrationTestRunner } from "@medusajs/test-utils";
import { DEFAULT_STORE_SETTINGS } from "@nocido/theme/defaults";
import { STORE_SETTINGS_MODULE } from "..";
import { applyUpdate } from "../lib/settings";
import StoreSettingsRecord from "../models/store-settings-record";
import type StoreSettingsModuleService from "../service";

const ENCRYPTION_KEY = "integration-test-key-0123456789";

moduleIntegrationTestRunner<StoreSettingsModuleService>({
  moduleName: STORE_SETTINGS_MODULE,
  moduleModels: [StoreSettingsRecord],
  // essadrati_test, from DB_TEST_URL (integration-tests/setup.ts).
  dbName: process.env.DB_TEMP_NAME,
  moduleOptions: { encryptionKey: ENCRYPTION_KEY },
  resolve: "./src/modules/store-settings",
  testSuite: ({ service }) => {
    describe("StoreSettingsModuleService", () => {
      it("returns defaults before the first save", async () => {
        expect(await service.getSettings()).toEqual(DEFAULT_STORE_SETTINGS);
        expect(await service.getSnapshot()).toBeNull();
      });

      it("saves, reads back and keeps a single row", async () => {
        const first = applyUpdate(DEFAULT_STORE_SETTINGS, { commerce: { returnDays: 3 } });
        await service.saveSettings(first.settings, first.password);
        const second = applyUpdate(await service.getSettings(), { commerce: { returnDays: 5 } });
        const saved = await service.saveSettings(second.settings, second.password);

        expect(saved.commerce.returnDays).toBe(5);
        expect(await service.listStoreSettingsRecords()).toHaveLength(1);
      });

      it("replaces the JSON instead of merging it, so cleared texts stay cleared", async () => {
        const filled = applyUpdate(DEFAULT_STORE_SETTINGS, {
          identity: { tagline: { fr: "Slogan" } },
          contact: { socials: { instagram: "https://instagram.com/example" } },
        });
        await service.saveSettings(filled.settings, filled.password);

        const cleared = applyUpdate(await service.getSettings(), {
          identity: { tagline: {} },
          contact: { socials: { instagram: null } },
        });
        const saved = await service.saveSettings(cleared.settings, cleared.password);

        expect(saved.identity.tagline).toEqual({});
        expect(saved.contact.socials.instagram).toBeNull();
        expect(await service.listStoreSettingsRecords()).toHaveLength(1);
        expect(await service.listStoreSettingsRecords({}, { withDeleted: true })).toHaveLength(2);
      });

      it("encrypts the SMTP password and never returns it", async () => {
        const update = applyUpdate(DEFAULT_STORE_SETTINGS, { smtp: { password: "s3cret" } });
        const saved = await service.saveSettings(update.settings, update.password);

        expect(saved.smtp.passwordSet).toBe(true);
        expect(JSON.stringify(saved)).not.toContain("s3cret");
        const snapshot = await service.getSnapshot();
        expect(snapshot?.smtp_password).toMatch(/^v1\./);
        expect(await service.getSmtpPassword()).toBe("s3cret");

        const kept = applyUpdate(saved, { smtp: { host: "smtp.example.test" } });
        await service.saveSettings(kept.settings, kept.password);
        expect(await service.getSmtpPassword()).toBe("s3cret");

        const cleared = applyUpdate(await service.getSettings(), { smtp: { password: null } });
        await service.saveSettings(cleared.settings, cleared.password);
        expect(await service.getSmtpPassword()).toBeNull();
      });

      it("restores a previous snapshot", async () => {
        expect(await service.getSnapshot()).toBeNull();
        const update = applyUpdate(DEFAULT_STORE_SETTINGS, { commerce: { returnDays: 9 } });
        await service.saveSettings(update.settings, update.password);
        await service.restoreSnapshot(null);
        expect(await service.getSnapshot()).toBeNull();

        await service.saveSettings(update.settings, update.password);
        const snapshot = await service.getSnapshot();
        const next = applyUpdate(update.settings, { commerce: { returnDays: 1 } });
        await service.saveSettings(next.settings, next.password);
        await service.restoreSnapshot(snapshot);
        expect((await service.getSettings()).commerce.returnDays).toBe(9);
      });

      it("public settings hide SMTP and bank details", async () => {
        const publicSettings = await service.getPublicSettings();
        expect(publicSettings).not.toHaveProperty("smtp");
        expect(publicSettings.billing).not.toHaveProperty("rib");
        expect(publicSettings.commerce).not.toHaveProperty("technicalEmailDomain");
      });
    });
  },
});
