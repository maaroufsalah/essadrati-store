import { defineRouteConfig } from "@medusajs/admin-sdk";
import { House } from "@medusajs/icons";
import { Button, Container, Text } from "@medusajs/ui";
import { homepageSchema, TRUST_ICONS } from "@nocido/types";
import type { ReactNode } from "react";
import { type UseFormReturn, useFieldArray } from "react-hook-form";
import { z } from "zod";
import {
  Grid,
  LocalizedField,
  MediaField,
  NumberField,
  Section,
  SelectField,
  TextField,
} from "../../../components/fields";
import { type FormValues, SettingsForm } from "../../../components/settings-form";
import { t } from "../../../lib/i18n";

const schema = z.object({ homepage: homepageSchema });

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

const HomepageSettingsPage = () => (
  <SettingsForm
    title={t("home.title")}
    description={t("home.description")}
    schema={schema}
    pick={(settings) => ({ homepage: settings.homepage })}
  >
    {(form) => (
      <>
        <Section title={t("home.hero")}>
          <LocalizedField name="homepage.hero.eyebrow" label={t("home.eyebrow")} />
          <LocalizedField name="homepage.hero.title" label={t("home.heroTitle")} />
          <LocalizedField name="homepage.hero.subtitle" label={t("home.heroSubtitle")} multiline />
          <Grid>
            <TextField name="homepage.hero.ctaHref" label={t("home.ctaHref")} dir="ltr" nullable />
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

export const config = defineRouteConfig({ label: t("home.label"), icon: House });

export default HomepageSettingsPage;
