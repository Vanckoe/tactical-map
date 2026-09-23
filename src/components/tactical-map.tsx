"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Unit } from "@/lib/simulation";
import { symbolSvg, affiliationColor } from "@/lib/symbology";
import { useSymbolStandard } from "@/components/symbology/symbol-provider";
import { echelonLabel, getUnitStats } from "@/lib/unit-balance";
import type { Scenario } from "@/lib/scenarios";
import type { Battle } from "@/lib/battle";
type Props = {
  scenario?: Scenario;
  points: Battle["points"];
  releasedReserves: string[];
  units: Unit[];
  selected: string;
  onSelect: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  grid: boolean;
  routes: boolean;
  focus: [number, number];
  zoomAction: number;
  enemies: boolean;
};
export default function TacticalMap({
  scenario, points, releasedReserves,
  units,
  selected,
  onSelect,
  onMapClick,
  grid,
  routes,
  focus,
  zoomAction,
  enemies,
}: Props) {
  const { t } = useI18n();
  const { standard } = useSymbolStandard();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const group = useRef<L.LayerGroup | null>(null);
  const handlers = useRef({ onSelect, onMapClick });
  useEffect(() => {
    handlers.current = { onSelect, onMapClick };
  }, [onSelect, onMapClick]);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([43.36, 77.07], 10);
    map.current = m;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(m);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(m);
    group.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) =>
      handlers.current.onMapClick(e.latlng.lat, e.latlng.lng),
    );
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.clearLayers();
    scenario?.terrain.forEach((zone) => {
      L.circle([zone.lat, zone.lng], { radius: zone.radiusKm * 1000, color: zone.type === "water" ? "#377ea5" : zone.type === "urban" ? "#9b7185" : "#987838", weight: 1, fillOpacity: 0.2, dashArray: zone.type === "water" ? undefined : "4 4" }).addTo(g).bindTooltip(t(zone.label));
    });
    scenario?.objectives.forEach((objective) => {
      const state = points[objective.id];
      const label = `${objective.name} · ${state?.contested ? "Оспаривается" : state?.owner === "blue" ? "Свои" : state?.owner === "red" ? "Противник" : "Нейтральная"}`;
      L.circle([objective.lat, objective.lng], { radius: objective.radiusKm * 1000, color: state?.owner ? affiliationColor(standard, state.owner) : "#565656", weight: 2, fillOpacity: 0.08 }).addTo(g).bindTooltip(t(label), { permanent: true, direction: "center" });
    });
    scenario?.reserves.filter((wave) => !releasedReserves.includes(wave.id)).forEach((wave, index) => {
      const position = wave.units[0];
      if (!enemies && position.side === "red") return;
      L.circleMarker([position.lat, position.lng], { radius: 12, color: affiliationColor(standard, position.side), dashArray: "3 4", fillOpacity: 0.1 })
        .addTo(g).bindTooltip(t(`${wave.name} · ${wave.releaseSeconds / 60} мин`), { permanent: true, direction: index % 2 ? "bottom" : "top" });
    });
    units
      .filter((u) => enemies || u.side === "blue")
      .forEach((u) => {
        const active = u.id === selected;
        L.marker([u.lat, u.lng], {
          title: t(u.name),
          alt: t(u.name),
          icon: L.divIcon({
            className: `unit-marker ${active ? "selected" : ""} ${u.hp <= 0 ? "disabled" : ""}`,
            html: `${symbolSvg(u.kind, u.side, standard, u.echelon)}<span>${u.id.padStart(2, "0")} / ${t(echelonLabel(u.kind, u.echelon))}</span>`,
            iconSize: [56, 59],
            iconAnchor: [28, 27],
          }),
        })
          .addTo(g)
          .on("click", () => handlers.current.onSelect(u.id));
        if (active && u.hp > 0)
          L.circle([u.lat, u.lng], {
            radius: (getUnitStats(u).supportKm || getUnitStats(u).rangeKm || getUnitStats(u).detectionKm) * 1000,
            color: affiliationColor(standard, u.side, u.kind),
            weight: 1,
            dashArray: "5 7",
            fillOpacity: 0.055,
            interactive: false,
          }).addTo(g);
        if (routes && u.target)
          L.polyline([[u.lat, u.lng], ...(u.route ?? [u.target])], {
            color: affiliationColor(standard, u.side, u.kind),
            weight: 2,
            dashArray: "7 7",
            interactive: false,
          }).addTo(g);
      });
  }, [units, selected, routes, enemies, standard, scenario, points, releasedReserves, t]);
  useEffect(() => {
    if (scenario && focus[0] === scenario.center[0] && focus[1] === scenario.center[1]) {
      const positions = [...scenario.units, ...scenario.reserves.flatMap((wave) => wave.units)];
      map.current?.fitBounds(L.latLngBounds(positions.map((u) => [u.lat, u.lng])), { paddingTopLeft: [window.innerWidth > 900 ? 360 : 60, 180], paddingBottomRight: [150, 130], maxZoom: 12 });
    } else map.current?.flyTo(focus, scenario ? 12 : 10, { duration: 0.8 });
  }, [focus, scenario]);
  const lastZoom = useRef(0);
  useEffect(() => {
    if (zoomAction !== lastZoom.current)
      map.current?.zoomIn(zoomAction > lastZoom.current ? 1 : -1);
    lastZoom.current = zoomAction;
  }, [zoomAction]);
  return (
    <div
      className={`map-canvas ${grid ? "with-grid" : ""}`}
      ref={el}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && map.current) {
          const p = map.current.getCenter();
          onMapClick(p.lat, p.lng);
        }
      }}
      aria-label={t("Интерактивная карта Казахстана")}
    />
  );
}
