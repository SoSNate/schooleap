export default function Fraction({ numerator, denominator, whole, className = '' }) {
  return (
    <span className={`fraction ${className}`}>
      {whole > 0 && (
        <span className="flex items-center gap-1.5" dir="ltr">
          <span className="whole-number">{whole}</span>
          <span className="fraction">
            <span className="numerator">{numerator}</span>
            <span className="denominator">{denominator}</span>
          </span>
        </span>
      )}
      {!whole && (
        <>
          <span className="numerator">{numerator}</span>
          <span className="denominator">{denominator}</span>
        </>
      )}
    </span>
  );
}
