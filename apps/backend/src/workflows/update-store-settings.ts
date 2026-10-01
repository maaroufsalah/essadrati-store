import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { emitEventStep } from "@medusajs/medusa/core-flows";
import type { StoreSettings, StoreSettingsUpdate } from "@nocido/types";
import { STORE_SETTINGS_MODULE } from "../modules/store-settings";
import { applyUpdate } from "../modules/store-settings/lib/settings";
import type StoreSettingsModuleService from "../modules/store-settings/service";
import type { StoreSettingsSnapshot } from "../modules/store-settings/service";

export const STORE_SETTINGS_UPDATED_EVENT = "store_settings.updated";

export interface UpdateStoreSettingsInput {
  /** Admin payload, already parsed with storeSettingsUpdateSchema. */
  patch: StoreSettingsUpdate;
}

const saveStoreSettingsStep = createStep(
  "save-store-settings",
  async (input: UpdateStoreSettingsInput, { container }) => {
    const service = container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
    const previous = await service.getSnapshot();
    const { settings, password } = applyUpdate(await service.getSettings(), input.patch);
    const saved = await service.saveSettings(settings, password);
    return new StepResponse<StoreSettings, StoreSettingsSnapshot | null>(saved, previous);
  },
  async (previous, { container }) => {
    if (previous === undefined) return;
    const service = container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
    await service.restoreSnapshot(previous);
  },
);

/**
 * Merges the admin patch, validates it (schema and theme contrast), saves it
 * and emits `store_settings.updated` so the storefront cache is revalidated.
 */
export const updateStoreSettingsWorkflow = createWorkflow(
  "update-store-settings",
  (input: UpdateStoreSettingsInput) => {
    const settings = saveStoreSettingsStep(input);
    const eventData = transform({ settings }, ({ settings: saved }) => ({
      updatedAt: saved.updatedAt,
    }));
    emitEventStep({ eventName: STORE_SETTINGS_UPDATED_EVENT, data: eventData });
    return new WorkflowResponse(settings);
  },
);
