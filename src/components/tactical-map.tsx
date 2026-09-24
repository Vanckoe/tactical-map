"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ObservedUnit } from "@/lib/border-patrol";
import { symbolSvg, affiliationColor } from "@/lib/symbology";
import { useSymbolStandard } from "@/components/symbology/symbol-provider";
import { echelonLabel, getUnitStats } from "@/lib/unit-balance";
import type { Scenario } from "@/lib/scenarios";
import type { Battle } from "@/lib/battle";
import { isWorkspaceShortcut } from "@/lib/keyboard";
import { planRoute, type Waypoint } from "@/lib/terrain";
import { TRANSFER_SECONDS } from "@/lib/transport";
import { UNIT_PROFILES } from "@/lib/unit-balance";
type Props = {
  scenario?: Scenario;
  points: Battle["points"];
  releasedReserves: string[];
  units: ObservedUnit[];
  selected: string;
  onSelect: (id: string) => void;
  onMapClick: (lat: number, lng: number, shiftKey: boolean) => void;
  placing: boolean;
  running: boolean;
  patrolStart?: Waypoint;
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
  placing, running,
  patrolStart,
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
  const previousUnits = useRef(new Set<string>());
  const previousProgress = useRef(new Map<string, number>());
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
    const panKeys: Record<string, [number, number]> = {
      KeyW: [0, -1], ArrowUp: [0, -1],
      KeyA: [-1, 0], ArrowLeft: [-1, 0],
      KeyS: [0, 1], ArrowDown: [0, 1],
      KeyD: [1, 0], ArrowRight: [1, 0],
    };
    const pressed = new Set<string>();
    const mapPane = m.getPane("mapPane")!;
    let frame = 0;
    let lastTime = 0;
    let velocityX = 0;
    let velocityY = 0;
    const stopPan = () => {
      pressed.clear();
      const wasMoving = frame !== 0;
      cancelAnimationFrame(frame);
      frame = 0;
      velocityX = velocityY = 0;
      if (wasMoving) m.fire("moveend");
    };
    const animatePan = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      let x = 0;
      let y = 0;
      for (const key of pressed) {
        x += panKeys[key][0];
        y += panKeys[key][1];
      }
      const length = Math.hypot(x, y) || 1;
      const easing = 1 - Math.exp(-dt / 0.16);
      velocityX += (x / length * 280 - velocityX) * easing;
      velocityY += (y / length * 280 - velocityY) * easing;
      // Keep subpixel positions throughout one pan gesture. panBy rounds its
      // offset and emits moveend on every call, causing visible frame steps.
      const position = L.DomUtil.getPosition(mapPane);
      L.DomUtil.setPosition(mapPane, position.subtract(L.point(velocityX * dt, velocityY * dt)));
      m.fire("move");
      if (!pressed.size && Math.hypot(velocityX, velocityY) < 1) {
        stopPan();
        return;
      }
      frame = requestAnimationFrame(animatePan);
    };
    const handlePan = (event: KeyboardEvent) => {
      if (!isWorkspaceShortcut(event)) {
        stopPan();
        return;
      }
      if (!panKeys[event.code]) return;
      event.preventDefault();
      // Handle arrows before Leaflet's keyboard listener to avoid panning twice.
      event.stopPropagation();
      pressed.add(event.code);
      if (!frame) {
        m.stop();
        m.fire("movestart");
        lastTime = performance.now();
        frame = requestAnimationFrame(animatePan);
      }
    };
    const releasePan = (event: KeyboardEvent) => pressed.delete(event.code);
    window.addEventListener("keydown", handlePan, true);
    window.addEventListener("keyup", releasePan, true);
    window.addEventListener("blur", stopPan);
    document.addEventListener("visibilitychange", stopPan);
    document.addEventListener("focusin", stopPan);
    m.on("dragstart zoomstart", stopPan);
    m.on("click", (e: L.LeafletMouseEvent) =>
      handlers.current.onMapClick(e.latlng.lat, e.latlng.lng, e.originalEvent.shiftKey),
    );
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(el.current);
    return () => {
      window.removeEventListener("keydown", handlePan, true);
      window.removeEventListener("keyup", releasePan, true);
      window.removeEventListener("blur", stopPan);
      document.removeEventListener("visibilitychange", stopPan);
      document.removeEventListener("focusin", stopPan);
      m.off("dragstart zoomstart", stopPan);
      stopPan();
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (placing) map.current?.boxZoom.disable();
    else map.current?.boxZoom.enable();
  }, [placing]);
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.clearLayers();
    if (patrolStart) L.circleMarker(patrolStart, { radius: 6, color: affiliationColor(standard, "blue"), interactive: false })
      .addTo(g).bindTooltip("A", { permanent: true, direction: "top" });
    if (scenario?.borderPatrol) {
      const { territory, entry, outposts } = scenario.borderPatrol;
      L.polygon(territory.polygon, {
        color: "#987838", weight: 2, dashArray: "8 6", fill: false, interactive: false,
      }).addTo(g);
      if (scenario.borderPatrol.searchArea) L.polygon(scenario.borderPatrol.searchArea, { color: "#987838", weight: 1, dashArray: "4 6", fillOpacity: 0.08, interactive: false }).addTo(g).bindTooltip(t("Первоначальный район поиска"), { permanent: true, direction: "top" });
      else L.circleMarker([entry.lat, entry.lng], { radius: 5, color: "#987838", interactive: false })
        .addTo(g).bindTooltip(t("Сообщение: пересечение у ЖД"), { permanent: true, direction: "top" });
      outposts.forEach((post) => L.circleMarker([post.lat, post.lng], { radius: 4, color: affiliationColor(standard, "blue"), interactive: false })
        .addTo(g));
    }
    scenario?.terrain.forEach((zone) => {
      L.circle([zone.lat, zone.lng], { radius: zone.radiusKm * 1000, color: zone.type === "water" ? "#377ea5" : zone.type === "urban" ? "#9b7185" : "#987838", weight: 1, fillOpacity: 0.2, dashArray: zone.type === "water" ? undefined : "4 4" }).addTo(g).bindTooltip(t(zone.label));
    });
    scenario?.objectives.forEach((objective) => {
      const state = points[objective.id];
      const label = scenario.borderPatrol ? `${objective.name} · ${t("Цель нарушителя")}` : `${objective.name} · ${state?.contested ? "Оспаривается" : state?.owner === "blue" ? "Свои" : state?.owner === "red" ? "Противник" : "Нейтральная"}`;
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
        const appearing = previousUnits.current.size > 0 && !previousUnits.current.has(u.id);
        const progress = u.transportOperation ? 1 - u.transportOperation.remainingSeconds / TRANSFER_SECONDS : 0;
        const oldProgress = previousProgress.current.get(u.id) ?? progress;
        const ring = u.transportOperation ? `<svg class="transport-ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" class="transport-ring-track"/><circle cx="32" cy="32" r="29" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - progress * 100}" style="--ring-from:${100 - oldProgress * 100};--ring-to:${100 - progress * 100};animation:${running ? 'transport-fill .3s linear both' : 'none'}"/></svg>` : "";
        L.marker([u.lat, u.lng], {
          title: t(u.contactLost ? `${u.name} · Контакт потерян` : u.name),
          alt: t(u.contactLost ? `${u.name} · Контакт потерян` : u.name),
          icon: L.divIcon({
            className: `unit-marker ${active ? "selected" : ""} ${u.hp <= 0 ? "disabled" : ""} ${u.contactLost ? "contact-lost" : ""} ${appearing ? "unit-arriving" : ""}`,
            html: `${ring}${symbolSvg(u.kind, u.side, standard, u.echelon)}<span>${u.kind === "transport" ? `${t("Транспорт")} ${u.passengerCount ?? 0}/5` : `${u.id.padStart(2, "0")} / ${t(echelonLabel(u.kind, u.echelon))}`}</span>`,
            iconSize: [56, 59],
            iconAnchor: [28, 27],
          }),
        })
          .addTo(g)
          .on("click", () => handlers.current.onSelect(u.id));
        if (active && u.hp > 0 && u.side === "blue" && scenario?.borderPatrol)
          L.circle([u.lat, u.lng], {
            radius: scenario.borderPatrol.detectionRadiusKm * 1000,
            color: affiliationColor(standard, u.side, u.kind),
            weight: 1, fillOpacity: 0.035, interactive: false,
          }).addTo(g);
        if (active && u.kind !== "transport" && u.hp > 0 && !u.contactLost && (!scenario?.borderPatrol || u.side === "blue"))
          L.circle([u.lat, u.lng], {
            radius: (scenario?.borderPatrol ? scenario.borderPatrol.captureRadiusKm : getUnitStats(u).supportKm || getUnitStats(u).rangeKm || getUnitStats(u).detectionKm) * 1000,
            color: affiliationColor(standard, u.side, u.kind),
            weight: 1,
            dashArray: "5 7",
            fillOpacity: 0.055,
            interactive: false,
          }).addTo(g);
        if (routes && u.patrol && !u.contactLost) {
          const [a, b] = u.patrol.points;
          const path = planRoute({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] }, scenario?.terrain ?? [], UNIT_PROFILES[u.kind].airborne);
          L.polyline([a, ...path], { color: affiliationColor(standard, u.side, u.kind), weight: 2, dashArray: "4 6", interactive: false }).addTo(g);
          if (active) [a, b].forEach((point, index) => L.circleMarker(point, { radius: 5, color: affiliationColor(standard, u.side, u.kind), interactive: false })
            .addTo(g).bindTooltip(index === 0 ? "A" : "Б", { permanent: true, direction: "top" }));
        }
        if (routes && u.target)
          L.polyline([[u.lat, u.lng], ...(u.route ?? [u.target])], {
            color: affiliationColor(standard, u.side, u.kind),
            weight: 2,
            dashArray: "7 7",
            interactive: false,
          }).addTo(g);
      });
    previousUnits.current = new Set(units.map((u) => u.id));
    previousProgress.current = new Map(units.filter((u) => u.transportOperation).map((u) => [u.id, 1 - u.transportOperation!.remainingSeconds / TRANSFER_SECONDS]));
  }, [units, selected, routes, enemies, standard, scenario, points, releasedReserves, patrolStart, running, t]);
  useEffect(() => {
    if (scenario && focus[0] === scenario.center[0] && focus[1] === scenario.center[1]) {
      const positions = [...scenario.units.filter((u) => !scenario.borderPatrol?.starts || u.side === "blue"), ...scenario.objectives, ...scenario.reserves.flatMap((wave) => wave.units)];
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
          onMapClick(p.lat, p.lng, e.shiftKey);
        }
      }}
      aria-label={t("Интерактивная карта Казахстана")}
    />
  );
}
