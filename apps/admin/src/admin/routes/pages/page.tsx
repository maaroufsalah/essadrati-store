import { defineRouteConfig } from "@medusajs/admin-sdk";
import { DocumentText } from "@medusajs/icons";
import { Button, Container, Heading, StatusBadge, Table, Text, toast } from "@medusajs/ui";
import { KIT_ROUTES } from "@nocido/api-client";
import type { Page } from "@nocido/types";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch } from "../../lib/api";
import { currentLanguage, t } from "../../lib/i18n";

const PagesListPage = () => {
  const [pages, setPages] = useState<Page[] | null>(null);
  const language = currentLanguage();

  useEffect(() => {
    adminFetch<{ pages: Page[] }>(KIT_ROUTES.adminPages)
      .then((body) => setPages(body.pages))
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : String(error));
        setPages([]);
      });
  }, []);

  return (
    <Container className="flex flex-col gap-4 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Heading level="h1">{t("pages.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("pages.description")}
          </Text>
        </div>
        <Button size="small" asChild>
          <Link to="/pages/new">{t("pages.new")}</Link>
        </Button>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("pages.pageTitle")}</Table.HeaderCell>
            <Table.HeaderCell>{t("pages.handle")}</Table.HeaderCell>
            <Table.HeaderCell>{t("pages.status")}</Table.HeaderCell>
            <Table.HeaderCell>{t("pages.showInFooter")}</Table.HeaderCell>
            <Table.HeaderCell>{t("pages.updated")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {pages?.length === 0 ? (
            <Table.Row>
              <Table.Cell>{t("pages.empty")}</Table.Cell>
            </Table.Row>
          ) : null}
          {pages?.map((page) => (
            <Table.Row key={page.id}>
              <Table.Cell>
                <Link className="text-ui-fg-interactive" to={`/pages/${page.id}`}>
                  {page.title[language] ?? page.title.fr ?? page.title.ar ?? page.handle}
                </Link>
              </Table.Cell>
              <Table.Cell className="font-mono">{page.handle}</Table.Cell>
              <Table.Cell>
                <StatusBadge color={page.status === "published" ? "green" : "grey"}>
                  {t(`pages.status.${page.status}`)}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{page.showInFooter ? "✓" : ""}</Table.Cell>
              <Table.Cell>{new Date(page.updatedAt).toLocaleString(language)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  );
};

export const config = defineRouteConfig({ label: t("pages.label"), icon: DocumentText });

export default PagesListPage;
