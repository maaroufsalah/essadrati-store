import { defineRouteConfig } from "@medusajs/admin-sdk";
import { House } from "@medusajs/icons";
import { Button, Container, Label, Switch, Tabs, Text } from "@medusajs/ui";
import { KIT_ROUTES } from "@nocido/api-client";
import { DEFAULT_THEME_CONFIG } from "@nocido/theme/defaults";
import {
  type CategoryBanner,
  categoryBannerInputSchema,
  type HeroSlide,
  heroSlideInputSchema,
  HOME_IMAGE_SIZES,
  HOME_SECTION_IDS,
  homepageSchema,
  homeSectionsSchema,
  type LocalizedString,
  type MediaRef,
  normalizeHomeSections,
  resolveLocalized,
  SLIDE_DURATION,
  SLIDE_OVERLAY,
  sliderOptionsSchema,
  type TextAlign,
  type ThemeConfig,
  TRUST_ICONS,
} from "@nocido/types";
import { type ReactNode, useEffect, useId, useState } from "react";
import { Controller, type FieldValues, type UseFormReturn, useFieldArray } from "react-hook-form";
import { z } from "zod";
import {
  Grid,
  LocalizedField,
  MediaField,
  NumberField,
  RadioField,
  Section,
  SelectField,
  SwitchField,
  TextField,
} from "../../../components/fields";
import { LinkField, RangeField } from "../../../components/home-fields";
import { HomeItemsManager } from "../../../components/home-items-manager";
import { BannerPreview, SlidePreview } from "../../../components/home-preview";
import { type FormValues, SettingsForm } from "../../../components/settings-form";
import { SortableList } from "../../../components/sortable-list";
import { fetchSettings } from "../../../lib/api";
import { t, translate } from "../../../lib/i18n";
import { usePreviewFonts } from "../../../lib/preview-fonts";

/* ---------- Blocks: order, visibility, slider options ---------- */

// useFieldArray reserves `id`: in the form, the block id travels as `sectionId`.
const layoutSchema = z.object({
  homepage: z.object({
    sections: z.array(z.object({ sectionId: z.enum(HOME_SECTION_IDS), enabled: z.boolean() })),
    slider: sliderOptionsSchema,
  }),
});

function SectionsList({ form }: { form: UseFormReturn<FormValues> }) {
  const { fields, move } = useFieldArray({ control: form.control, name: "homepage.sections" });
  const switchId = useId();
  return (
    <SortableList items={fields} itemKey={(field) => field.id} onMove={move}>
      {(field, index) => {
        const id = (field as unknown as { sectionId: string }).sectionId;
        return (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <Label htmlFor={`${switchId}-${index}`} size="small" weight="plus">
                {translate(`home.block.${id}`)}
              </Label>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {translate(`home.block.${id}.hint`)}
              </Text>
            </div>
            <Controller
              control={form.control}
              name={`homepage.sections.${index}.enabled`}
              render={({ field: input }) => (
                <Switch
                  id={`${switchId}-${index}`}
                  checked={input.value === true}
                  onCheckedChange={(checked) => input.onChange(checked)}
                />
              )}
            />
          </div>
        );
      }}
    </SortableList>
  );
}

function LayoutTab() {
  return (
    <SettingsForm
      title={t("home.layoutTitle")}
      description={t("home.layoutDescription")}
      schema={layoutSchema}
      pick={(settings) => ({
        homepage: {
          sections: normalizeHomeSections(settings.homepage.sections).map((section) => ({
            sectionId: section.id,
            enabled: section.enabled,
          })),
          slider: settings.homepage.slider,
        },
      })}
      toUpdate={(values) => {
        const homepage = values.homepage as {
          sections: { sectionId: string; enabled: boolean }[];
          slider: z.infer<typeof sliderOptionsSchema>;
        };
        return {
          homepage: {
            sections: homeSectionsSchema.parse(
              homepage.sections.map((section) => ({
                id: section.sectionId,
                enabled: section.enabled,
              })),
            ),
            slider: homepage.slider,
          },
        };
      }}
    >
      {(form) => (
        <>
          <Section title={t("home.blocks")}>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("home.blocksHint")}
            </Text>
            <SectionsList form={form} />
          </Section>
          <Section title={t("home.sliderOptions")}>
            <Grid>
              <RadioField
                name="homepage.slider.transition"
                label={t("home.sliderTransition")}
                options={[
                  { value: "fade", label: t("home.sliderTransition.fade") },
                  { value: "slide", label: t("home.sliderTransition.slide") },
                ]}
              />
              <SwitchField name="homepage.slider.autoplay" label={t("home.sliderAutoplay")} />
            </Grid>
          </Section>
        </>
      )}
    </SettingsForm>
  );
}

/* ---------- Hero slides and category banners ---------- */

/** Theme of the store, for the slide and banner previews. */
function usePreviewTheme(): ThemeConfig {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  useEffect(() => {
    fetchSettings()
      .then((settings) => setTheme(settings.theme))
      .catch(() => undefined);
  }, []);
  usePreviewFonts(theme);
  return theme;
}

const sizeHint = (size: { width: number; height: number }) =>
  t("homeItems.sizeHint", { width: size.width, height: size.height });

const HERO_API = { path: KIT_ROUTES.adminHeroSlides, listKey: "slides", itemKey: "slide" };
const BANNERS_API = {
  path: KIT_ROUTES.adminCategoryBanners,
  listKey: "banners",
  itemKey: "banner",
};

// Watched form values are untyped: narrow them for the previews.
const localized = (value: unknown) => (value ?? {}) as LocalizedString;
const media = (value: unknown) => (value ?? null) as MediaRef | null;

function SlidesTab({ theme }: { theme: ThemeConfig }) {
  return (
    <HomeItemsManager<HeroSlide>
      api={HERO_API}
      schema={heroSlideInputSchema}
      empty={(rank) => ({
        active: true,
        rank,
        imageDesktop: null,
        imageMobile: null,
        title: {},
        subtitle: {},
        ctaLabel: {},
        link: null,
        textAlign: "start",
        overlay: SLIDE_OVERLAY.default,
        durationSeconds: SLIDE_DURATION.default,
      })}
      toInput={({ id: _id, updatedAt: _updatedAt, ...input }) => input}
      fields={
        <>
          <SwitchField name="active" label={t("homeItems.activeToggle")} />
          <Grid>
            <MediaField
              name="imageDesktop"
              label={`${t("homeItems.imageDesktop")} · ${sizeHint(HOME_IMAGE_SIZES.slideDesktop)}`}
            />
            <MediaField
              name="imageMobile"
              label={`${t("homeItems.imageMobile")} · ${sizeHint(HOME_IMAGE_SIZES.slideMobile)}`}
            />
          </Grid>
          <LocalizedField name="title" label={t("homeItems.title")} />
          <LocalizedField name="subtitle" label={t("homeItems.subtitle")} multiline />
          <LocalizedField name="ctaLabel" label={t("homeItems.ctaLabel")} />
          <LinkField name="link" label={t("homeItems.link")} />
          <RadioField
            name="textAlign"
            label={t("homeItems.textAlign")}
            options={[
              { value: "start", label: t("homeItems.textAlign.start") },
              { value: "center", label: t("homeItems.textAlign.center") },
              { value: "end", label: t("homeItems.textAlign.end") },
            ]}
          />
          <RangeField
            name="overlay"
            label={t("homeItems.overlay")}
            min={SLIDE_OVERLAY.min}
            max={SLIDE_OVERLAY.max}
            unit=" %"
          />
          <NumberField
            name="durationSeconds"
            label={t("homeItems.duration")}
            min={SLIDE_DURATION.min}
            max={SLIDE_DURATION.max}
          />
        </>
      }
      preview={(values: FieldValues, mode, locale) => (
        <SlidePreview
          theme={theme}
          mode={mode}
          locale={locale}
          imageDesktop={media(values.imageDesktop)}
          imageMobile={media(values.imageMobile)}
          title={localized(values.title)}
          subtitle={localized(values.subtitle)}
          ctaLabel={localized(values.ctaLabel)}
          textAlign={(values.textAlign as TextAlign | undefined) ?? "start"}
          overlay={typeof values.overlay === "number" ? values.overlay : 0}
        />
      )}
      labels={{
        title: t("homeItems.slidesTitle"),
        description: t("homeItems.slidesDescription"),
        add: t("homeItems.addSlide"),
        empty: t("homeItems.slidesEmpty"),
        newItem: t("homeItems.newSlide"),
        deleteTitle: t("homeItems.deleteSlide"),
        deleteConfirm: t("homeItems.deleteConfirm"),
      }}
    />
  );
}

function BannersTab({ theme }: { theme: ThemeConfig }) {
  return (
    <HomeItemsManager<CategoryBanner>
      api={BANNERS_API}
      schema={categoryBannerInputSchema}
      empty={(rank) => ({
        active: true,
        rank,
        imageDesktop: null,
        imageMobile: null,
        title: {},
        tagline: {},
        ctaLabel: {},
        link: null,
      })}
      toInput={({ id: _id, updatedAt: _updatedAt, ...input }) => input}
      fields={
        <>
          <SwitchField name="active" label={t("homeItems.activeToggle")} />
          <Grid>
            <MediaField
              name="imageDesktop"
              label={`${t("homeItems.imageDesktop")} · ${sizeHint(HOME_IMAGE_SIZES.bannerDesktop)}`}
            />
            <MediaField
              name="imageMobile"
              label={`${t("homeItems.imageMobile")} · ${sizeHint(HOME_IMAGE_SIZES.bannerMobile)}`}
            />
          </Grid>
          <LocalizedField name="title" label={t("homeItems.title")} />
          <LocalizedField name="tagline" label={t("homeItems.tagline")} />
          <LocalizedField name="ctaLabel" label={t("homeItems.ctaLabel")} />
          <LinkField name="link" label={t("homeItems.link")} />
        </>
      }
      preview={(values: FieldValues, mode, locale) => (
        <BannerPreview
          theme={theme}
          mode={mode}
          locale={locale}
          imageDesktop={media(values.imageDesktop)}
          imageMobile={media(values.imageMobile)}
          title={localized(values.title)}
          tagline={localized(values.tagline)}
          cta={
            resolveLocalized(localized(values.ctaLabel), locale) || t("homeItems.bannerDefaultCta")
          }
        />
      )}
      labels={{
        title: t("homeItems.bannersTitle"),
        description: t("homeItems.bannersDescription"),
        add: t("homeItems.addBanner"),
        empty: t("homeItems.bannersEmpty"),
        newItem: t("homeItems.newBanner"),
        deleteTitle: t("homeItems.deleteBanner"),
        deleteConfirm: t("homeItems.deleteConfirm"),
      }}
    />
  );
}

/* ---------- Editorial content (hero fallback, trust, story, reviews) ---------- */

const contentSchema = z.object({
  homepage: homepageSchema.omit({ sections: true, slider: true }),
});

function ListItem({ onRemove, children }: { onRemove: () => void; children: ReactNode }) {
  return (
    <Container className="bg-ui-bg-subtle flex flex-col gap-3 p-4">
      {children}
      <div>
        <Button type="button" size="small" variant="transparent" onClick={onRemove}>
          {t("home.remove")}
        </Button>
      </div>
    </Container>
  );
}

function TrustList({ form }: { form: UseFormReturn<FormValues> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "homepage.trust",
  });
  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <ListItem key={field.id} onRemove={() => remove(index)}>
          <SelectField
            name={`homepage.trust.${index}.icon`}
            label={t("home.icon")}
            options={TRUST_ICONS.map((icon) => ({ value: icon, label: icon }))}
          />
          <LocalizedField name={`homepage.trust.${index}.title`} label={t("home.itemTitle")} />
          <LocalizedField name={`homepage.trust.${index}.text`} label={t("home.itemText")} />
        </ListItem>
      ))}
      {fields.length < 4 ? (
        <div>
          <Button
            type="button"
            size="small"
            variant="secondary"
            onClick={() => append({ icon: "truck", title: {}, text: {} })}
          >
            {t("home.add")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatsList({ form }: { form: UseFormReturn<FormValues> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "homepage.story.stats",
  });
  return (
    <div className="flex flex-col gap-3">
      <Text size="small" weight="plus">
        {t("home.stats")}
      </Text>
      {fields.map((field, index) => (
        <ListItem key={field.id} onRemove={() => remove(index)}>
          <Grid>
            <NumberField
              name={`homepage.story.stats.${index}.value`}
              label={t("home.statValue")}
              min={0}
            />
            <TextField
              name={`homepage.story.stats.${index}.suffix`}
              label={t("home.statSuffix")}
              dir="ltr"
            />
          </Grid>
          <LocalizedField
            name={`homepage.story.stats.${index}.label`}
            label={t("home.statLabel")}
          />
        </ListItem>
      ))}
      {fields.length < 4 ? (
        <div>
          <Button
            type="button"
            size="small"
            variant="secondary"
            onClick={() => append({ value: 0, suffix: "", label: {} })}
          >
            {t("home.add")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TestimonialsList({ form }: { form: UseFormReturn<FormValues> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "homepage.testimonials",
  });
  return (
    <div className="flex flex-col gap-3">
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t("home.testimonialsHint")}
      </Text>
      {fields.map((field, index) => (
        <ListItem key={field.id} onRemove={() => remove(index)}>
          <Grid>
            <TextField name={`homepage.testimonials.${index}.name`} label={t("home.name")} />
            <TextField name={`homepage.testimonials.${index}.city`} label={t("home.city")} />
            <NumberField
              name={`homepage.testimonials.${index}.rating`}
              label={t("home.rating")}
              min={1}
              max={5}
            />
          </Grid>
          <LocalizedField
            name={`homepage.testimonials.${index}.text`}
            label={t("home.text")}
            multiline
          />
        </ListItem>
      ))}
      {fields.length < 12 ? (
        <div>
          <Button
            type="button"
            size="small"
            variant="secondary"
            onClick={() => append({ name: "", city: "", rating: 5, text: {} })}
          >
            {t("home.add")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ContentTab() {
  return (
    <SettingsForm
      title={t("home.title")}
      description={t("home.description")}
      schema={contentSchema}
      pick={(settings) => {
        const { sections: _sections, slider: _slider, ...content } = settings.homepage;
        return { homepage: content };
      }}
    >
      {(form) => (
        <>
          <Section title={t("home.hero")}>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("home.heroFallbackHint")}
            </Text>
            <LocalizedField name="homepage.hero.eyebrow" label={t("home.eyebrow")} />
            <LocalizedField name="homepage.hero.title" label={t("home.heroTitle")} />
            <LocalizedField
              name="homepage.hero.subtitle"
              label={t("home.heroSubtitle")}
              multiline
            />
            <Grid>
              <TextField
                name="homepage.hero.ctaHref"
                label={t("home.ctaHref")}
                dir="ltr"
                nullable
              />
              <MediaField name="homepage.hero.image" label={t("home.heroImage")} />
            </Grid>
            <LocalizedField name="homepage.hero.ctaLabel" label={t("home.ctaLabel")} />
          </Section>
          <Section title={t("home.trust")}>
            <TrustList form={form} />
          </Section>
          <Section title={t("home.story")}>
            <LocalizedField name="homepage.story.title" label={t("home.storyTitle")} />
            <LocalizedField name="homepage.story.text" label={t("home.storyText")} multiline />
            <Grid>
              <MediaField name="homepage.story.image" label={t("home.storyImage")} />
              <TextField
                name="homepage.story.ctaHref"
                label={t("home.storyCta")}
                dir="ltr"
                nullable
              />
            </Grid>
            <StatsList form={form} />
          </Section>
          <Section title={t("home.testimonials")}>
            <TestimonialsList form={form} />
          </Section>
          <Section title={t("home.giftCollection")}>
            <TextField
              name="homepage.giftCollectionHandle"
              label={t("home.giftCollection")}
              dir="ltr"
              nullable
            />
          </Section>
        </>
      )}
    </SettingsForm>
  );
}

/* ---------- Page ---------- */

const TABS = ["layout", "slides", "banners", "content"] as const;

const HomepageSettingsPage = () => {
  const theme = usePreviewTheme();
  return (
    <Tabs defaultValue="layout" className="flex flex-col gap-y-3">
      <Container className="px-6 py-3">
        <Tabs.List>
          {TABS.map((tab) => (
            <Tabs.Trigger key={tab} value={tab}>
              {translate(`home.tab.${tab}`)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Container>
      {/* Mounted once and hidden: switching tabs keeps unsaved edits. */}
      <Tabs.Content value="layout" forceMount className="data-[state=inactive]:hidden">
        <LayoutTab />
      </Tabs.Content>
      <Tabs.Content value="slides" forceMount className="data-[state=inactive]:hidden">
        <SlidesTab theme={theme} />
      </Tabs.Content>
      <Tabs.Content value="banners" forceMount className="data-[state=inactive]:hidden">
        <BannersTab theme={theme} />
      </Tabs.Content>
      <Tabs.Content value="content" forceMount className="data-[state=inactive]:hidden">
        <ContentTab />
      </Tabs.Content>
    </Tabs>
  );
};

export const config = defineRouteConfig({ label: t("home.label"), icon: House });

export default HomepageSettingsPage;
