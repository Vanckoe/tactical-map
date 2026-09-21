import { Kind, symbolSvg } from "@/lib/simulation";
export default function UnitSymbol({
  kind,
  side = "blue",
}: {
  kind: Kind;
  side?: string;
}) {
  return (
    <span
      className="unit-symbol"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: symbolSvg(kind, side) }}
    />
  );
}
