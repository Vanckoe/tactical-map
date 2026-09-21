import type { Echelon, Kind } from "./unit-balance";

/* =========================================================
   TYPES / CONSTANTS
   ========================================================= */

export type SymbolStandard = "nato" | "kz";

export const STANDARD_LABELS = {
  nato: "НАТО",
  kz: "Казахстан",
} as const;

export const SYMBOL_SOURCE = "http://lemur59.ru/node/427";

/**
 * Обозначения размера подразделения.
 *
 * I   = рота
 * II  = батальон
 * III = полк
 * X   = бригада
 * XX  = дивизия
 */
export const echelonLabels: Record<Echelon, string> = {
  Отделение: "●",
  Взвод: "●●●",
  Рота: "I",
  Батальон: "II",
  Полк: "III",
  Бригада: "X",
  Дивизия: "XX",
};

/* =========================================================
   COLORS
   ========================================================= */

const NATO_COLORS = {
  friendly: {
    background: "#45BFE2",
    backgroundBottom: "#37AFCF",
    border: "#111820",
    icon: "#111820",
  },

  hostile: {
    background: "#ED7373",
    backgroundBottom: "#D85F5F",
    border: "#111820",
    icon: "#111820",
  },
};

/**
 * Сохраняем старую функцию,
 * чтобы существующий код продолжал работать.
 */
export function affiliationColor(
  standard: SymbolStandard,
  side: string,
  kind?: Kind,
) {
  if (standard === "nato") {
    return side === "blue"
      ? NATO_COLORS.friendly.background
      : NATO_COLORS.hostile.background;
  }

  if (side !== "blue") {
    return "#245cb5";
  }

  return kind &&
    [
      "artillery",
      "airdefense",
      "antitank",
      "engineer",
      "logistics",
      "medical",
      "ew",
    ].includes(kind)
    ? "#242424"
    : "#bc3434";
}

/* =========================================================
   NATO SYMBOL GLYPHS
   ========================================================= */

/**
 * Внутренние графические знаки.
 *
 * viewBox основного символа: 0 0 80 68
 *
 * Рамка подразделения занимает примерно:
 * x = 8..72
 * y = 20..58
 *
 * Поэтому внутренние символы располагаются
 * преимущественно в районе x 20..60 / y 27..51.
 */
const natoShapes: Record<Kind, string> = {
  /**
   * Infantry
   *
   * Скрещенные линии + маленький гусеничный знак снизу.
   * Визуально близко к mechanized infantry на вашем примере.
   */
  infantry: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="3.1"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M25 29L55 48" />
      <path d="M55 29L25 48" />

      <path d="M22.5 27.5L29 31.5" />
      <path d="M57.5 27.5L51 31.5" />

      <path d="M22.5 49.5L29 45.5" />
      <path d="M57.5 49.5L51 45.5" />

      <rect
        x="35"
        y="46"
        width="10"
        height="5"
        rx="2.5"
        stroke-width="2.4"
      />
    </g>
  `,

  /**
   * Armor / tank
   *
   * NATO-style track / armored oval.
   */
  armor: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect
        x="24"
        y="31"
        width="32"
        height="15"
        rx="7.5"
      />
    </g>
  `,

  /**
   * Reconnaissance
   */
  recon: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M23 46L40 29L57 46" />
      <path d="M29 46L40 35L51 46" />

      <circle
        cx="40"
        cy="40"
        r="3.2"
        fill="currentColor"
        stroke="none"
      />
    </g>
  `,

  /**
   * Anti-tank
   */
  antitank: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M23 47L40 28L57 47" />

      <path d="M40 28V49" />

      <path d="M30 38H50" />

      <path d="M45 33L51 38L45 43" />
    </g>
  `,

  /**
   * Engineers
   */
  engineer: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M22 48L29 29H51L58 48" />

      <path d="M26 39H54" />

      <path d="M33 29V48" />
      <path d="M47 29V48" />

      <path d="M29 34H51" />
    </g>
  `,

  /**
   * Logistics / supply
   */
  logistics: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M24 48V34L40 27L56 34V48" />

      <path d="M24 34H56" />

      <path d="M40 34V48" />
    </g>
  `,

  /**
   * Medical
   */
  medical: `
    <g fill="currentColor">
      <path
        d="
          M36 27
          H44
          V34
          H51
          V42
          H44
          V49
          H36
          V42
          H29
          V34
          H36
          Z
        "
      />
    </g>
  `,

  /**
   * Electronic warfare
   */
  ew: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M40 37V49" />

      <circle
        cx="40"
        cy="37"
        r="2.7"
        fill="currentColor"
        stroke="none"
      />

      <path d="M32 34Q40 26 48 34" />

      <path d="M26 30Q40 17 54 30" />

      <path d="M34 49H46" />
    </g>
  `,

  /**
   * Artillery
   */
  artillery: `
    <g>
      <circle
        cx="40"
        cy="39"
        r="6"
        fill="currentColor"
      />

      <circle
        cx="40"
        cy="39"
        r="2"
        fill="white"
      />
    </g>
  `,

  /**
   * Air defence
   */
  airdefense: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M23 47Q40 23 57 47" />

      <path d="M40 27V47" />

      <path d="M35 32L40 27L45 32" />
    </g>
  `,

  /**
   * Aviation
   */
  air: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M40 27V49" />

      <path d="M22 39L40 33L58 39" />

      <path d="M32 47L40 43L48 47" />
    </g>
  `,

  /**
   * UAV / drone
   */
  drone: `
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M30 32L50 46" />
      <path d="M50 32L30 46" />

      <circle cx="27" cy="29" r="3.5" />
      <circle cx="53" cy="29" r="3.5" />

      <circle cx="27" cy="49" r="3.5" />
      <circle cx="53" cy="49" r="3.5" />

      <rect
        x="36"
        y="35"
        width="8"
        height="8"
        rx="2"
      />
    </g>
  `,
};

/* =========================================================
   NATO RENDERER
   ========================================================= */

function renderNatoSymbol(
  kind: Kind,
  side: string,
  echelon?: Echelon,
): string {
  const friendly = side === "blue";

  const colors = friendly
    ? NATO_COLORS.friendly
    : NATO_COLORS.hostile;

  const echelonLabel = echelon
    ? echelonLabels[echelon]
    : "";

  /**
   * Friendly:
   * rectangular frame
   *
   * Hostile:
   * diamond frame
   */
  const frame = friendly
    ? `
      <g>
        <!-- shadow -->
        <rect
          x="9.5"
          y="21.5"
          width="62"
          height="38"
          rx="2.2"
          fill="#000000"
          opacity="0.20"
        />

        <!-- main frame -->
        <rect
          x="8"
          y="20"
          width="64"
          height="38"
          rx="2"
          fill="${colors.background}"
          stroke="${colors.border}"
          stroke-width="3"
        />

        <!-- upper highlight -->
        <path
          d="M11 23H69"
          stroke="#ffffff"
          stroke-opacity="0.28"
          stroke-width="1.3"
          stroke-linecap="round"
        />

        <!-- lower subtle shade -->
        <path
          d="M11 55H69"
          stroke="#0B1116"
          stroke-opacity="0.16"
          stroke-width="1.3"
          stroke-linecap="round"
        />
      </g>
    `
    : `
      <g>
        <!-- shadow -->
        <path
          d="
            M41.5 19
            L73.5 40
            L41.5 61
            L9.5 40
            Z
          "
          fill="#000000"
          opacity="0.20"
        />

        <!-- hostile frame -->
        <path
          d="
            M40 17
            L72 39
            L40 61
            L8 39
            Z
          "
          fill="${colors.background}"
          stroke="${colors.border}"
          stroke-width="3"
          stroke-linejoin="round"
        />

        <!-- highlight -->
        <path
          d="M40 20L68 39"
          stroke="#ffffff"
          stroke-opacity="0.24"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </g>
    `;

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="68"
      viewBox="0 0 80 68"
      fill="none"
    >
      ${
        echelonLabel
          ? `
        <text
          x="40"
          y="14"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="13"
          font-weight="700"
          letter-spacing="1"
          fill="${colors.border}"
        >
          ${echelonLabel}
        </text>
      `
          : ""
      }

      ${frame}

      <g
        style="color:${colors.icon}"
      >
        ${natoShapes[kind]}
      </g>
    </svg>
  `;
}

/* =========================================================
   KAZAKHSTAN SYMBOLS
   ========================================================= */

/**
 * These are DALA teaching glyphs,
 * not a verified Armed Forces of Kazakhstan standard.
 */
const kzShapes: Record<Kind, string> = {
  recon: `
    <path d="M7 24L25 15L42 24L25 33Z"/>
    <circle cx="25" cy="24" r="4"/>
  `,

  antitank: `
    <path d="M8 24H38M38 24L29 17M38 24L29 31"/>
    <rect x="12" y="19" width="10" height="10"/>
  `,

  engineer: `
    <path d="M9 30H41M15 30V20H35V30M20 20V15M30 20V15"/>
  `,

  logistics: `
    <path d="M10 32V20L25 13L40 20V32ZM10 20H40M25 20V32"/>
  `,

  medical: `
    <path d="M20 14H30V21H37V29H30V36H20V29H13V21H20Z"/>
  `,

  ew: `
    <path d="M25 34V19M18 34H32M17 18Q25 10 33 18M11 13Q25 2 39 13"/>
    <circle cx="25" cy="21" r="3"/>
  `,

  infantry: `
    <path d="M12 18H36V30H12ZM6 24H12M36 24H43M36 20L43 24L36 28"/>
  `,

  armor: `
    <path d="M8 24L25 16L40 24L25 32ZM40 24H47"/>
  `,

  artillery: `
    <circle cx="25" cy="27" r="5"/>
    <path d="M25 22V12M16 16H34"/>
  `,

  air: `
    <path d="M25 12V36M9 26L25 20L41 26M18 34L25 30L32 34"/>
  `,

  drone: `
    <path d="M15 17L35 33M35 17L15 33"/>
    <circle cx="13" cy="15" r="4"/>
    <circle cx="37" cy="15" r="4"/>
    <circle cx="13" cy="35" r="4"/>
    <circle cx="37" cy="35" r="4"/>
  `,

  airdefense: `
    <circle cx="25" cy="28" r="5"/>
    <path d="M25 23V12M19 18L25 12L31 18M12 35H38"/>
  `,
};

/* =========================================================
   KAZAKHSTAN RENDERER
   ========================================================= */

function renderKzSymbol(
  kind: Kind,
  side: string,
  echelon?: Echelon,
): string {
  const color = affiliationColor(
    "kz",
    side,
    kind,
  );

  const labels: Record<Echelon, string> = {
    Отделение: "",
    Взвод: "I",
    Рота: "II",
    Батальон: "III",
    Полк: "п",
    Бригада: "бр",
    Дивизия: "д",
  };

  const label = echelon
    ? labels[echelon]
    : "";

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="42"
      viewBox="0 0 50 42"
      fill="none"
    >
      ${
        label
          ? `
        <text
          x="25"
          y="9"
          text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="10"
          font-weight="700"
          fill="${color}"
        >
          ${label}
        </text>
      `
          : ""
      }

      <g
        fill="white"
        stroke="${color}"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        ${kzShapes[kind]}
      </g>
    </svg>
  `;
}

/* =========================================================
   CACHE
   ========================================================= */

const svgCache = new Map<string, string>();

/* =========================================================
   MAIN FUNCTION
   ========================================================= */

/**
 * Возвращает SVG военной иконки.
 *
 * Пример:
 *
 * symbolSvg(
 *   "infantry",
 *   "blue",
 *   "nato",
 *   "Батальон"
 * )
 */
export function symbolSvg(
  kind: Kind,
  side = "blue",
  standard: SymbolStandard = "nato",
  echelon?: Echelon,
): string {
  const key = [
    kind,
    side,
    standard,
    echelon ?? "",
  ].join(":");

  const cached = svgCache.get(key);

  if (cached) {
    return cached;
  }

  let svg: string;

  if (standard === "nato") {
    svg = renderNatoSymbol(
      kind,
      side,
      echelon,
    );
  } else {
    svg = renderKzSymbol(
      kind,
      side,
      echelon,
    );
  }

  svgCache.set(key, svg);

  return svg;
}

/* =========================================================
   OPTIONAL HELPERS
   ========================================================= */

/**
 * Если SVG нужен для <img src="...">
 *
 * Пример:
 *
 * <img
 *   src={symbolDataUrl(
 *     "armor",
 *     "blue",
 *     "nato",
 *     "Рота"
 *   )}
 * />
 */
export function symbolDataUrl(
  kind: Kind,
  side = "blue",
  standard: SymbolStandard = "nato",
  echelon?: Echelon,
): string {
  const svg = symbolSvg(
    kind,
    side,
    standard,
    echelon,
  );

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Очистить кеш.
 * Обычно вызывать не нужно.
 */
export function clearSymbolCache() {
  svgCache.clear();
}