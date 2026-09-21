"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Unit } from "@/lib/simulation";
import { symbolSvg, affiliationColor } from "@/lib/symbology";
import { useSymbolStandard } from "@/components/symbology/symbol-provider";
import { echelonLabel, getUnitStats } from "@/lib/unit-balance";
type Props = {
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
    units
      .filter((u) => enemies || u.side === "blue")
      .forEach((u) => {
        const active = u.id === selected;
        L.marker([u.lat, u.lng], {
          title: u.name,
          alt: u.name,
          icon: L.divIcon({
            className: `unit-marker ${active ? "selected" : ""} ${u.hp <= 0 ? "disabled" : ""}`,
            html: `${symbolSvg(u.kind, u.side, standard, u.echelon)}<span>${u.id.padStart(2, "0")} / ${echelonLabel(u.kind, u.echelon)}</span>`,
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
          L.polyline([[u.lat, u.lng], u.target], {
            color: affiliationColor(standard, u.side, u.kind),
            weight: 2,
            dashArray: "7 7",
            interactive: false,
          }).addTo(g);
      });
  }, [units, selected, routes, enemies, standard]);
  useEffect(() => {
    map.current?.flyTo(focus, 10, { duration: 0.8 });
  }, [focus]);
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
      aria-label="Интерактивная карта Казахстана"
    />
  );
}
