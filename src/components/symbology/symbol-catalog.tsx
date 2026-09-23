"use client";
import { useI18n } from "@/components/i18n/language-provider";


import Link from "next/link";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UnitSymbol from "@/components/unit-symbol";
import { StandardSwitch } from "./standard-switch";
import { useSymbolStandard } from "./symbol-provider";
import { geometryLabels, symbolCatalog, symbolGroups } from "@/lib/symbol-catalog";
import { SYMBOL_SOURCE, affiliationColor, echelonLabels } from "@/lib/symbology";

export function SymbolCatalog() {
  const { t } = useI18n();
  const { standard } = useSymbolStandard();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [side, setSide] = useState("blue");
  const normalized = query.trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
  const filtered = symbolCatalog.filter((entry) =>
    (category === "all" || category === entry.category) &&
    (availability === "all" || (availability === "available" ? !!entry.kind : !entry.kind)) &&
    `${t(entry.name)} ${entry.name} ${entry.id}`.toLocaleLowerCase("ru").replaceAll("ё", "е").includes(normalized),
  );
  return <main className="symbols-page">
    <header className="symbols-header">
      <Link href="/" className="flex items-center gap-3 font-semibold tracking-widest"><ArrowLeft className="size-4" /><span>DALA</span><span className="hidden text-xs font-normal tracking-normal text-muted-foreground sm:inline">{t("К карте")}</span></Link>
      <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">{t("Система обозначений")}</span><StandardSwitch /><LanguageSwitch /></div>
    </header>
    <div className="symbols-content">
      <section className="symbols-intro" aria-labelledby="symbols-title">
        <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><BookOpen className="size-4" />{t("СПРАВОЧНИК / 01")}</p>
        <h1 id="symbols-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("Язык тактической карты")}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{t("Условные знаки объясняют, какой объект находится на карте, кому он принадлежит и к какому подразделению относится. Здесь собраны обозначения для DALA и каталог для будущих слоёв: от пунктов управления до инженерных сооружений.")}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs"><span><strong>{symbolCatalog.length}</strong>{t(" позиций в каталоге")}</span><span><strong>{symbolCatalog.filter((entry) => entry.kind).length}</strong>{t(" типов в песочнице")}</span><span><strong>{symbolGroups.length}</strong>{t(" разделов")}</span><a className="inline-flex items-center gap-1 underline underline-offset-4" href={SYMBOL_SOURCE} target="_blank" rel="noreferrer">{t("Материал-основа")}<ArrowUpRight className="size-3" /></a></div>
      </section>
      <section className="symbols-note" aria-label={t("О стандартах")}>
        <strong className="text-sm">{t(standard === "nato" ? "НАТО · APP-6" : "Казахстан · учебная адаптация")}</strong>
        <p className="mt-2 text-xs leading-6">{t(standard === "nato" ? "Знаки доступных типов строятся библиотекой milsymbol в режиме APP-6. Принадлежность меняет цвет и форму рамки. Это выбранный набор для песочницы, а не полный перечень APP-6." : "Материал-основа описывает Советскую Армию. Режим Казахстана пока использует учебную адаптацию этих принципов и игровые знаки. Соответствие официальным документам ВС РК не подтверждено.")}{t(" Переключатель действует на карту, список соединений и инспектор. Выбор сохраняется в браузере.")}</p>
      </section>
      <div className="symbols-layout">
        <aside className="symbols-sidebar" aria-label={t("Разделы справочника")}>
          <p className="mb-3 text-xs font-medium text-muted-foreground">{t("КАТАЛОГ")}</p>
          <nav className="symbols-categories" aria-label={t("Фильтр разделов")}>
            {[{ id: "all", name: "Все обозначения" }, ...symbolGroups].map((group) => <button key={group.id} onClick={() => setCategory(group.id)} aria-pressed={category === group.id} className={category === group.id ? "active" : ""}><span>{t(group.name)}</span><span className="tabular-nums text-muted-foreground">{group.id === "all" ? symbolCatalog.length : symbolCatalog.filter((entry) => entry.category === group.id).length}</span></button>)}
          </nav>
          <a href="#reading" className="mt-5 block text-xs underline underline-offset-4">{t("Как читать обозначения")}</a>
          <a href="#source" className="mt-3 block text-xs underline underline-offset-4">{t("Об источнике и полноте")}</a>
        </aside>
        <section className="min-w-0" aria-labelledby="catalog-heading">
          <div className="symbols-filters">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="h-10 pl-9" type="search" placeholder={t("Найти знак, например «переправа»")} aria-label={t("Поиск обозначений")} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <label className="flex items-center gap-2 rounded-md border px-3 text-xs"><SlidersHorizontal className="size-4" /><span className="sr-only">{t("Доступность")}</span><select className="h-10 min-w-0 bg-transparent" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">{t("Все статусы")}</option><option value="available">{t("В песочнице")}</option><option value="future">{t("На будущее")}</option></select></label>
          </div>
          <div className="my-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="catalog-heading" className="text-sm font-semibold">{t(category === "all" ? "Все обозначения" : symbolGroups.find((group) => group.id === category)?.name)} <span className="ml-2 font-normal text-muted-foreground" role="status">{filtered.length}</span></h2>
            <div className="flex gap-1" role="group" aria-label={t("Принадлежность в предпросмотре")}>{[{ id: "blue", name: "Свои" }, { id: "red", name: "Противник" }].map((item) => <Button key={item.id} variant={side === item.id ? "secondary" : "ghost"} size="sm" aria-pressed={side === item.id} onClick={() => setSide(item.id)}>{t(item.name)}</Button>)}</div>
          </div>
          <p className="mb-4 text-xs leading-5 text-muted-foreground">{t("«На будущее» — запись для дальнейшего добавления на карту. Её графика и соответствие между системами ещё требуют сверки; знак не подменяется вымышленным аналогом.")}</p>
          <div className="symbols-list">
            {filtered.map((entry) => <details className="symbol-entry" key={entry.id}>
              <summary><span className="symbol-preview">{entry.kind ? <UnitSymbol kind={entry.kind} side={side} echelon="Батальон" /> : <span className="text-xs text-muted-foreground" aria-label={t("Графика требует сверки")}>—</span>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{t(entry.name)}</span><span className="mt-1 block text-xs text-muted-foreground">{t(geometryLabels[entry.geometry])}</span></span><span className={`symbol-status ${entry.kind ? "available" : ""}`}>{t(entry.kind ? "В песочнице" : "На будущее")}</span></summary>
              <div className="symbol-description"><p>{t(entry.description)}</p>{!entry.kind && <p className="mt-2">{t("Предусмотрено в каталоге по материалу-основе. Отрисовка, сопоставление с НАТО и размещение на карте пока не подключены.")}</p>}<p className="mt-2 font-mono text-[10px] text-muted-foreground">ID: {t(entry.id)}</p></div>
            </details>)}
          </div>
          {filtered.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center"><p className="text-sm font-medium">{t("Обозначения не найдены")}</p><p className="mt-2 text-xs text-muted-foreground">{t("Попробуйте другое название или сбросьте фильтры.")}</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setCategory("all"); setAvailability("all"); }}>{t("Сбросить фильтры")}</Button></div>}
        </section>
      </div>
      <section id="reading" className="symbols-reading">
        <h2 className="text-xl font-semibold">{t("Как читать обозначения")}</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div><h3 className="text-sm font-semibold">{t("01 / Принадлежность")}</h3><p className="mt-3 text-xs leading-6 text-muted-foreground">{t(standard === "nato" ? "НАТО: свои наземные подразделения имеют прямоугольную рамку, противник — ромбовидную. У воздушных средств другая форма рамки." : "По материалу-основе: свои общевойсковые знаки — красные, артиллерия и специальные войска — чёрные; противник — синий.")}</p><div className="mt-3 flex gap-5 text-xs">{["blue", "red"].map((affiliation) => <span key={affiliation} className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: affiliationColor(standard, affiliation) }} />{t(affiliation === "blue" ? "Свои" : "Противник")}</span>)}</div></div>
          <div><h3 className="text-sm font-semibold">{t("02 / Уровень подразделения")}</h3><p className="mt-3 text-xs leading-6 text-muted-foreground">{t("В НАТО отметка над наземным знаком задаёт уровень. Для авиации уровень в DALA показан в подписи. В учебной адаптации применяется отдельная система отметок.")}</p><p className="mt-3 font-mono text-xs">{t(standard === "nato" ? `Рота ${echelonLabels.Рота} · Батальон ${echelonLabels.Батальон} · Бригада ${echelonLabels.Бригада}` : "Взвод I · Рота II · Батальон III")}</p></div>
          <div><h3 className="text-sm font-semibold">{t("03 / Геометрия и состояние")}</h3><p className="mt-3 text-xs leading-6 text-muted-foreground">{t("Точка показывает объект, линия — рубеж или маршрут, площадь — район. В исходном материале прерывистая граница района обозначает планируемое положение. Эти слои зарезервированы в каталоге.")}</p></div>
        </div>
      </section>
      <section id="source" className="symbols-reading">
        <h2 className="text-xl font-semibold">{t("Материал-основа")}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{t("Страница «Тактические знаки» на lemur59.ru посвящена обозначениям Советской Армии. Каталог охватывает перечисленные там группы и варианты; игровые типы выделены отдельно. Сам автор отмечает, что его подборка неполная: поэтому это не перечень всех существующих знаков и не официальный стандарт Казахстана.")}</p>
        <div className="mt-4 flex flex-wrap gap-5 text-xs"><a className="underline underline-offset-4" href={SYMBOL_SOURCE} target="_blank" rel="noreferrer">{t("Открыть исходную работу ↗")}</a><a className="underline underline-offset-4" href="https://github.com/spatialillusions/milsymbol" target="_blank" rel="noreferrer">{t("Библиотека знаков НАТО ↗")}</a></div>
        <details className="mt-6 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">{t("Три обзорные таблицы из исходного материала")}</summary><p className="mt-3 text-xs leading-6 text-muted-foreground">{t("Исторические иллюстрации, сохранённые для изучения. Не являются таблицами соответствия стандартам НАТО или ВС РК. Нажмите на таблицу, чтобы открыть её в полном размере.")}</p><div className="mt-4 grid items-start gap-4 md:grid-cols-3">{[1, 2, 3].map((number) => <a href={`/reference/tactical-signs-${number}.jpg`} target="_blank" rel="noreferrer" key={number}>
          {/* Source scans retain their native proportions and need no image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-auto w-full rounded border" src={`/reference/tactical-signs-${number}.jpg`} alt={t(`Обзорная таблица тактических знаков из материала lemur59.ru, лист ${number}`)} loading="lazy" />
        </a>)}</div></details>
      </section>
      <footer className="mt-10 flex items-center justify-between border-t py-6 text-xs text-muted-foreground"><span>{t("DALA / Справочник обозначений")}</span><Link href="/" className="underline underline-offset-4">{t("К карте")}</Link></footer>
    </div>
  </main>;
}
