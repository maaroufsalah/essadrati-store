import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Container, Heading, Skeleton, toast, usePrompt } from "@medusajs/ui";
import { KIT_ROUTES } from "@nocido/api-client";
import { type Page, type PageInput, pageInputSchema } from "@nocido/types";
import { useEffect, useState } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Grid,
  LocalizedField,
  NumberField,
  RadioField,
  Section,
  SwitchField,
  TextField,
} from "../../../components/fields";
import { MarkdownField } from "../../../components/markdown-field";
import { adminFetch, ApiRequestError } from "../../../lib/api";
import { errorMessage, t } from "../../../lib/i18n";

const EMPTY: PageInput = {
  handle: "",
  title: {},
  content: {},
  seo: { metaTitle: {}, metaDescription: {} },
  status: "draft",
  showInFooter: false,
  footerRank: 10,
};

function toInput(page: Page): PageInput {
  const { handle, title, content, seo, status, showInFooter, footerRank } = page;
  return { handle, title, content, seo, status, showInFooter, footerRank };
}

/** Drops keys whose value is undefined (empty locales), like the settings forms do. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function Editor({ id, initial }: { id: string | null; initial: PageInput }) {
  const navigate = useNavigate();
  const prompt = usePrompt();
  const form = useForm<PageInput>({
    resolver: ((values, context, options) =>
      zodResolver(pageInputSchema)(clean(values), context, options)) as Resolver<PageInput>,
    defaultValues: initial,
  });
  const dirty = Object.keys(form.formState.dirtyFields).length > 0;

  const save = async (values: PageInput) => {
    try {
      const body = await adminFetch<{ page: Page }>(
        id ? `${KIT_ROUTES.adminPages}/${id}` : KIT_ROUTES.adminPages,
        { method: "POST", body: JSON.stringify(values) },
      );
      toast.success(t("pages.saved"));
      form.reset(toInput(body.page));
      if (!id) void navigate(`/pages/${body.page.id}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        for (const issue of error.issues) {
          if (issue.path) form.setError(issue.path as keyof PageInput, { message: issue.code });
        }
        toast.error(errorMessage(error.issues[0]?.code ?? error.message));
        return;
      }
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const remove = async () => {
    if (!id) return;
    if (!(await prompt({ title: t("pages.delete"), description: t("pages.deleteConfirm") })))
      return;
    await adminFetch(`${KIT_ROUTES.adminPages}/${id}`, { method: "DELETE" });
    toast.success(t("pages.deleted"));
    void navigate("/pages");
  };

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-y-3"
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(save, () => toast.error(t("common.invalid")))(event);
        }}
      >
        <Container className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2">
            <Link to="/pages" className="text-ui-fg-subtle txt-small">
              {t("pages.back")}
            </Link>
            <Heading level="h1">{initial.title.fr ?? initial.title.ar ?? t("pages.new")}</Heading>
            {dirty ? (
              <Badge color="orange" size="2xsmall">
                {t("common.unsaved")}
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-2">
            {id ? (
              <Button type="button" size="small" variant="danger" onClick={() => void remove()}>
                {t("pages.delete")}
              </Button>
            ) : null}
            <Button
              type="submit"
              size="small"
              isLoading={form.formState.isSubmitting}
              disabled={!dirty}
            >
              {t("common.save")}
            </Button>
          </div>
        </Container>
        <Section title={t("pages.title")}>
          <Grid>
            <TextField
              name="handle"
              label={t("pages.handle")}
              dir="ltr"
              hint={t("pages.handleHint")}
            />
            <RadioField
              name="status"
              label={t("pages.status")}
              options={[
                { value: "draft", label: t("pages.status.draft") },
                { value: "published", label: t("pages.status.published") },
              ]}
            />
            <SwitchField name="showInFooter" label={t("pages.showInFooter")} />
            <NumberField name="footerRank" label={t("pages.footerRank")} min={0} max={1000} />
          </Grid>
          <LocalizedField name="title" label={t("pages.pageTitle")} />
        </Section>
        <Section title={t("pages.content")}>
          <MarkdownField name="content" label={t("pages.content")} />
        </Section>
        <Section title={t("pages.seo")}>
          <LocalizedField name="seo.metaTitle" label={t("store.seoTitle")} />
          <LocalizedField name="seo.metaDescription" label={t("store.seoDescription")} multiline />
        </Section>
      </form>
    </FormProvider>
  );
}

const PageEditorPage = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const [initial, setInitial] = useState<PageInput | null>(isNew ? EMPTY : null);

  useEffect(() => {
    if (isNew) return;
    adminFetch<{ page: Page }>(`${KIT_ROUTES.adminPages}/${id}`)
      .then((body) => setInitial(toInput(body.page)))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      );
  }, [id, isNew]);

  if (!initial) {
    return (
      <Container className="flex flex-col gap-3 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </Container>
    );
  }
  return <Editor key={id ?? "new"} id={isNew ? null : (id ?? null)} initial={initial} />;
};

export default PageEditorPage;
