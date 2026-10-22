// A round quality seal, like a stamp: "GRADE A · Quality checked".
export default function GradeSeal({ grade, size = 58 }: { grade: "A" | "B"; size?: number }) {
  const ring = grade === "A" ? "#c8941f" : "#7b8a96";
  const fill = grade === "A" ? "#f6c64a" : "#c9d3da";
  const text = grade === "A" ? "#6b4a00" : "#33424e";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="seal" role="img" aria-label={`Grade ${grade}, quality checked`}>
      <defs>
        <path id={`seal-arc-${grade}`} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
      </defs>
      {/* scalloped edge */}
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 44} cy={50 + Math.sin(a) * 44} r="7" fill={ring} />;
      })}
      <circle cx="50" cy="50" r="44" fill={ring} />
      <circle cx="50" cy="50" r="39" fill={fill} />
      <circle cx="50" cy="50" r="27" fill="none" stroke={text} strokeOpacity="0.35" strokeWidth="1" />
      <text fontSize="8.5" fontWeight="800" letterSpacing="2" fill={text}>
        <textPath href={`#seal-arc-${grade}`} startOffset="2%">
          QUALITY CHECKED · FRESH CATCH ·
        </textPath>
      </text>
      <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="1.5" fill={text}>
        GRADE
      </text>
      <text x="50" y="68" textAnchor="middle" fontSize="24" fontWeight="900" fill={text}>
        {grade}
      </text>
    </svg>
  );
}
