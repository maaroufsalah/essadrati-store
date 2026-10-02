import { defineRouteConfig } from "@medusajs/admin-sdk";
import { TruckFast } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Switch,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import type { LocalizedString } from "@nocido/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, ApiRequestError } from "../../../lib/api";
import { errorMessage, t } from "../../../lib/i18n";

interface Zone {
  id: string;
  code: string;
  name: LocalizedString;
  fee: number;
  delivery_days_min: number;
  delivery_days_max: number;
}

interface City {
  id: string;
  slug: string;
  name: LocalizedString;
  fee: number | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  is_active: boolean;
  rank: number;
  zone: { id: string; code: string } | null;
}

function failure(error: unknown): void {
  const description =
    error instanceof ApiRequestError && error.issues.length > 0
      ? error.issues.map((issue) => errorMessage(issue.code)).join(" · ")
      : error instanceof Error
        ? error.message
        : undefined;
  toast.error(t("shipping.failed"), { description });
}

const numberOrNull = (value: string): number | null => (value.trim() === "" ? null : Number(value));

/* ------------------------------------------------------------------ zones */

function ZoneRow({ zone, onChanged }: { zone: Zone; onChanged: () => void }) {
  const [draft, setDraft] = useState(zone);
  const prompt = usePrompt();
  const dirty = JSON.stringify(draft) !== JSON.stringify(zone);

  const save = async () => {
    try {
      await adminFetch(`/admin/cod/zones/${zone.id}`, {
        method: "POST",
        body: JSON.stringify({
          name: draft.name,
          fee: draft.fee,
          delivery_days_min: draft.delivery_days_min,
          delivery_days_max: draft.delivery_days_max,
        }),
      });
      toast.success(t("shipping.saved"));
      onChanged();
    } catch (error) {
      failure(error);
    }
  };

  const remove = async () => {
    if (!(await prompt({ title: t("shipping.delete"), description: t("shipping.deleteConfirm") })))
      return;
    try {
      await adminFetch(`/admin/cod/zones/${zone.id}`, { method: "DELETE" });
      toast.success(t("shipping.deleted"));
      onChanged();
    } catch (error) {
      failure(error);
    }
  };

  return (
    <Table.Row>
      <Table.Cell className="font-mono">{zone.code}</Table.Cell>
      <Table.Cell>
        <Input
          size="small"
          value={draft.name.fr ?? ""}
          aria-label={t("shipping.name")}
          onChange={(event) =>
            setDraft({ ...draft, name: { ...draft.name, fr: event.target.value } })
          }
        />
      </Table.Cell>
      <Table.Cell>
        <Input
          size="small"
          type="number"
          min={0}
          className="w-24"
          aria-label={t("shipping.fee")}
          value={draft.fee}
          onChange={(event) => setDraft({ ...draft, fee: Number(event.target.value) })}
        />
      </Table.Cell>
      <Table.Cell>
        <div className="flex gap-1">
          <Input
            size="small"
            type="number"
            min={0}
            className="w-16"
            aria-label={t("shipping.daysMin")}
            value={draft.delivery_days_min}
            onChange={(event) =>
              setDraft({ ...draft, delivery_days_min: Number(event.target.value) })
            }
          />
          <Input
            size="small"
            type="number"
            min={0}
            className="w-16"
            aria-label={t("shipping.daysMax")}
            value={draft.delivery_days_max}
            onChange={(event) =>
              setDraft({ ...draft, delivery_days_max: Number(event.target.value) })
            }
          />
        </div>
      </Table.Cell>
      <Table.Cell className="text-end">
        <div className="flex justify-end gap-1">
          <Button size="small" variant="secondary" disabled={!dirty} onClick={() => void save()}>
            {t("shipping.save")}
          </Button>
          <Button size="small" variant="transparent" onClick={() => void remove()}>
            {t("shipping.delete")}
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

function NewZone({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [fee, setFee] = useState("40");
  const create = async () => {
    try {
      await adminFetch("/admin/cod/zones", {
        method: "POST",
        body: JSON.stringify({
          code,
          name: { fr: name },
          fee: Number(fee),
          delivery_days_min: 2,
          delivery_days_max: 4,
        }),
      });
      setCode("");
      setName("");
      onCreated();
    } catch (error) {
      failure(error);
    }
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input
        size="small"
        placeholder={t("shipping.code")}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="w-40"
      />
      <Input
        size="small"
        placeholder={t("shipping.name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-48"
      />
      <Input
        size="small"
        type="number"
        min={0}
        value={fee}
        aria-label={t("shipping.fee")}
        onChange={(event) => setFee(event.target.value)}
        className="w-24"
      />
      <Button
        size="small"
        variant="secondary"
        disabled={!code || !name}
        onClick={() => void create()}
      >
        {t("shipping.addZone")}
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------- cities */

function CityRow({ city, zones, onChanged }: { city: City; zones: Zone[]; onChanged: () => void }) {
  const [draft, setDraft] = useState(city);
  const prompt = usePrompt();
  const dirty = JSON.stringify(draft) !== JSON.stringify(city);
  const zone = zones.find((candidate) => candidate.id === draft.zone?.id);

  const save = async () => {
    try {
      await adminFetch(`/admin/cod/cities/${city.id}`, {
        method: "POST",
        body: JSON.stringify({
          name: draft.name,
          zone_id: draft.zone?.id,
          fee: draft.fee,
          is_active: draft.is_active,
          rank: draft.rank,
        }),
      });
      toast.success(t("shipping.saved"));
      onChanged();
    } catch (error) {
      failure(error);
    }
  };

  const remove = async () => {
    if (!(await prompt({ title: t("shipping.delete"), description: t("shipping.deleteConfirm") })))
      return;
    try {
      await adminFetch(`/admin/cod/cities/${city.id}`, { method: "DELETE" });
      onChanged();
    } catch (error) {
      failure(error);
    }
  };

  return (
    <Table.Row>
      <Table.Cell>
        <div className="flex flex-col">
          <Input
            size="small"
            value={draft.name.fr ?? ""}
            aria-label={t("shipping.name")}
            onChange={(event) =>
              setDraft({ ...draft, name: { ...draft.name, fr: event.target.value } })
            }
          />
          <Text size="xsmall" className="text-ui-fg-subtle" dir="rtl">
            {draft.name.ar ?? ""}
          </Text>
        </div>
      </Table.Cell>
      <Table.Cell>
        <Select
          size="small"
          value={draft.zone?.id}
          onValueChange={(value) => {
            const next = zones.find((candidate) => candidate.id === value);
            if (next) setDraft({ ...draft, zone: { id: next.id, code: next.code } });
          }}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {zones.map((candidate) => (
              <Select.Item key={candidate.id} value={candidate.id}>
                {candidate.name.fr ?? candidate.code}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </Table.Cell>
      <Table.Cell>
        <Input
          size="small"
          type="number"
          min={0}
          className="w-24"
          aria-label={t("shipping.feeOverride")}
          placeholder={zone ? `${zone.fee} (${t("shipping.zoneDefault")})` : ""}
          value={draft.fee ?? ""}
          onChange={(event) => setDraft({ ...draft, fee: numberOrNull(event.target.value) })}
        />
      </Table.Cell>
      <Table.Cell>
        <Switch
          checked={draft.is_active}
          aria-label={t("shipping.active")}
          onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
        />
      </Table.Cell>
      <Table.Cell>
        <Input
          size="small"
          type="number"
          min={0}
          className="w-16"
          aria-label={t("shipping.rank")}
          value={draft.rank}
          onChange={(event) => setDraft({ ...draft, rank: Number(event.target.value) })}
        />
      </Table.Cell>
      <Table.Cell className="text-end">
        <div className="flex justify-end gap-1">
          <Button size="small" variant="secondary" disabled={!dirty} onClick={() => void save()}>
            {t("shipping.save")}
          </Button>
          <Button size="small" variant="transparent" onClick={() => void remove()}>
            {t("shipping.delete")}
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

function NewCity({ zones, onCreated }: { zones: Zone[]; onCreated: () => void }) {
  const [slug, setSlug] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [zoneId, setZoneId] = useState<string | undefined>(undefined);
  const create = async () => {
    try {
      await adminFetch("/admin/cod/cities", {
        method: "POST",
        body: JSON.stringify({
          slug,
          name: { fr: nameFr, ...(nameAr ? { ar: nameAr } : {}) },
          zone_id: zoneId,
          fee: null,
          delivery_days_min: null,
          delivery_days_max: null,
          is_active: true,
          rank: 100,
        }),
      });
      setSlug("");
      setNameFr("");
      setNameAr("");
      onCreated();
    } catch (error) {
      failure(error);
    }
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input
        size="small"
        placeholder={t("shipping.slug")}
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        className="w-36"
      />
      <Input
        size="small"
        placeholder={`${t("shipping.name")} (fr)`}
        value={nameFr}
        onChange={(event) => setNameFr(event.target.value)}
        className="w-40"
      />
      <Input
        size="small"
        dir="rtl"
        placeholder={`${t("shipping.name")} (ar)`}
        value={nameAr}
        onChange={(event) => setNameAr(event.target.value)}
        className="w-40"
      />
      <Select size="small" value={zoneId} onValueChange={setZoneId}>
        <Select.Trigger className="w-44">
          <Select.Value placeholder={t("shipping.zone")} />
        </Select.Trigger>
        <Select.Content>
          {zones.map((zone) => (
            <Select.Item key={zone.id} value={zone.id}>
              {zone.name.fr ?? zone.code}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      <Button
        size="small"
        variant="secondary"
        disabled={!slug || !nameFr || !zoneId}
        onClick={() => void create()}
      >
        {t("shipping.addCity")}
      </Button>
    </div>
  );
}

const BOM = String.fromCharCode(0xfeff);

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv(cities: City[]): void {
  const header = "slug,name_ar,name_fr,name_en,zone_code,fee,days_min,days_max,active";
  const lines = cities.map((city) =>
    [
      city.slug,
      city.name.ar,
      city.name.fr,
      city.name.en,
      city.zone?.code,
      city.fee,
      city.delivery_days_min,
      city.delivery_days_max,
      city.is_active ? 1 : 0,
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([`${BOM}${[header, ...lines].join("\n")}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cod-cities.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------- page */

const CodShippingPage = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      adminFetch<{ zones: Zone[] }>("/admin/cod/zones"),
      adminFetch<{ cities: City[] }>("/admin/cod/cities"),
    ])
      .then(([zoneBody, cityBody]) => {
        if (!active) return;
        setZones(zoneBody.zones);
        setCities(cityBody.cities);
      })
      .catch(failure);
    return () => {
      active = false;
    };
  }, [version]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cities;
    return cities.filter((city) =>
      [city.slug, city.name.fr, city.name.ar, city.name.en].some((value) =>
        value?.toLowerCase().includes(term),
      ),
    );
  }, [cities, search]);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await adminFetch<{
        created: number;
        updated: number;
        skipped: unknown[];
        errors: unknown[];
      }>("/admin/cod/cities/import", {
        method: "POST",
        body: JSON.stringify({ csv: await file.text() }),
      });
      toast.success(
        t("shipping.importDone", { created: result.created, updated: result.updated }),
        {
          description:
            result.skipped.length + result.errors.length > 0
              ? t("shipping.importSkipped", { count: result.skipped.length + result.errors.length })
              : undefined,
        },
      );
      reload();
    } catch (error) {
      failure(error);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex flex-col gap-1 px-6 py-4">
        <Heading level="h1">{t("shipping.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("shipping.description")}
        </Text>
      </Container>

      <Container className="flex flex-col gap-4 px-6 py-4">
        <Heading level="h2">{t("shipping.zones")}</Heading>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("shipping.code")}</Table.HeaderCell>
              <Table.HeaderCell>{t("shipping.name")}</Table.HeaderCell>
              <Table.HeaderCell>{t("shipping.fee")}</Table.HeaderCell>
              <Table.HeaderCell>{t("shipping.days")}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {zones.map((zone) => (
              <ZoneRow key={`${zone.id}-${version}`} zone={zone} onChanged={reload} />
            ))}
          </Table.Body>
        </Table>
        <NewZone onCreated={reload} />
      </Container>

      <Container className="flex flex-col gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading level="h2">{t("shipping.cities")}</Heading>
          <div className="flex flex-wrap gap-2">
            <Input
              size="small"
              type="search"
              placeholder={t("shipping.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label={t("shipping.import")}
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
            <Button size="small" variant="secondary" onClick={() => fileRef.current?.click()}>
              {t("shipping.import")}
            </Button>
            <Button size="small" variant="secondary" onClick={() => exportCsv(cities)}>
              {t("shipping.export")}
            </Button>
          </div>
        </div>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {t("shipping.importHint")}
        </Text>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("shipping.name")}</Table.HeaderCell>
              <Table.HeaderCell>{t("shipping.zone")}</Table.HeaderCell>
              <Table.HeaderCell>{t("shipping.feeOverride")}</Table.HeaderCell>
              <Table.HeaderCell>{t("shipping.active")}</Table.HeaderCell>
              <Table.HeaderCell>{t("shipping.rank")}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtered.length === 0 ? (
              <Table.Row>
                <Table.Cell>{t("shipping.empty")}</Table.Cell>
              </Table.Row>
            ) : (
              filtered.map((city) => (
                <CityRow
                  key={`${city.id}-${version}`}
                  city={city}
                  zones={zones}
                  onChanged={reload}
                />
              ))
            )}
          </Table.Body>
        </Table>
        <NewCity zones={zones} onCreated={reload} />
      </Container>
    </div>
  );
};

export const config = defineRouteConfig({ label: t("shipping.label"), icon: TruckFast });

export default CodShippingPage;
