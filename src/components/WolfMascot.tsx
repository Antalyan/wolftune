interface WolfMascotProps {
  className?: string;
  size?: number;
  mood?: "happy" | "listening" | "howling" | "cool";
}

/**
 * WolfTune mascot — a chubby, kawaii plush-style blue wolf inspired by soft
 * toys like IKEA's Söt/Barnslig series: oversized round head, tiny bean body,
 * stubby limbs, dot eyes with sparkles, and blush marks. Wears Spotify-green
 * headphones in the "listening" and "cool" moods.
 */
export function WolfMascot({ className = "", size = 48, mood = "listening" }: WolfMascotProps) {
  const showHeadphones = mood === "listening" || mood === "cool";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WolfTune Mascot"
    >
      <defs>
        <linearGradient id="wolfFur" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7DB2FB" />
          <stop offset="55%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="headphoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1ED760" />
          <stop offset="100%" stopColor="#14833B" />
        </linearGradient>
      </defs>

      {/* Tail */}
      <ellipse cx="97" cy="99" rx="13" ry="9" transform="rotate(-35 97 99)" fill="#3B82F6" />
      <ellipse cx="105" cy="91" rx="5.5" ry="4" transform="rotate(-35 105 91)" fill="#BFDBFE" />

      {/* Bean body + belly patch */}
      <path
        d="M40 76 C36 96, 44 112, 60 112 C76 112, 84 96, 80 76 C74 71, 46 71, 40 76 Z"
        fill="url(#wolfFur)"
      />
      <ellipse cx="60" cy="99" rx="13" ry="10" fill="#BFDBFE" />

      {/* Stubby arms */}
      <ellipse cx="38" cy="90" rx="6.5" ry="10.5" transform="rotate(24 38 90)" fill="#3B82F6" />
      <ellipse cx="82" cy="90" rx="6.5" ry="10.5" transform="rotate(-24 82 90)" fill="#3B82F6" />

      {/* Little feet */}
      <ellipse cx="50" cy="110" rx="7.5" ry="5.5" fill="#3B82F6" />
      <ellipse cx="70" cy="110" rx="7.5" ry="5.5" fill="#3B82F6" />

      {/* Rounded plush ears */}
      <path d="M40 28 Q28 14 30 5 Q38 2 48 18 Q44 25 40 28 Z" fill="url(#wolfFur)" />
      <path d="M40 24 Q33 14 34 9 Q39 8 44 18 Q42 22 40 24 Z" fill="#93C5FD" />
      <path d="M80 28 Q92 14 90 5 Q82 2 72 18 Q76 25 80 28 Z" fill="url(#wolfFur)" />
      <path d="M80 24 Q87 14 86 9 Q81 8 76 18 Q78 22 80 24 Z" fill="#93C5FD" />

      {/* Oversized round head */}
      <circle cx="60" cy="46" r="32" fill="url(#wolfFur)" />
      <ellipse cx="48" cy="27" rx="14" ry="8" fill="#FFFFFF" opacity="0.14" />

      {/* Muzzle + tiny nose */}
      <ellipse cx="60" cy="58" rx="13.5" ry="10.5" fill="#DBEAFE" />
      <path d="M55 53 Q60 51 65 53 Q66 57 60 60 Q54 57 55 53 Z" fill="#0B1220" />

      {/* Blush */}
      <ellipse cx="34" cy="55" rx="4.8" ry="3" fill="#F9A8D4" opacity="0.55" />
      <ellipse cx="86" cy="55" rx="4.8" ry="3" fill="#F9A8D4" opacity="0.55" />

      {/* Eyes */}
      {mood === "cool" ? (
        // Rounded plush sunglasses
        <g>
          <rect x="33" y="38" width="20" height="12" rx="6" fill="#0B1220" />
          <rect x="67" y="38" width="20" height="12" rx="6" fill="#0B1220" />
          <path d="M53 42 h14" stroke="#0B1220" strokeWidth="3.5" />
          <path d="M37 41 l6 -1.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          <path d="M71 41 l6 -1.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
        </g>
      ) : mood === "happy" || mood === "howling" ? (
        // Cozy closed eyes ^ ^
        <g stroke="#0B1220" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M39 46 Q46 39 53 46" />
          <path d="M67 46 Q74 39 81 46" />
        </g>
      ) : (
        // Big sparkly dot eyes
        <g>
          <circle cx="46" cy="43.5" r="5.8" fill="#0B1220" />
          <circle cx="48" cy="41.5" r="2" fill="#FFFFFF" />
          <circle cx="43.5" cy="45.5" r="1.1" fill="#FFFFFF" opacity="0.9" />
          <circle cx="74" cy="43.5" r="5.8" fill="#0B1220" />
          <circle cx="76" cy="41.5" r="2" fill="#FFFFFF" />
          <circle cx="71.5" cy="45.5" r="1.1" fill="#FFFFFF" opacity="0.9" />
        </g>
      )}

      {/* Mouth */}
      {mood === "howling" ? (
        <g>
          {/* Little "aooo" mouth + floating music note */}
          <ellipse cx="60" cy="64" rx="4.5" ry="4.5" fill="#0B1220" />
          <circle cx="99" cy="27" r="3.2" fill="#1ED760" />
          <path
            d="M102.2 26 V13 l7 2.5"
            stroke="#1ED760"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      ) : mood === "happy" ? (
        <path d="M52 62 Q60 71 68 62 Q60 66 52 62 Z" fill="#0B1220" />
      ) : (
        <path d="M55 63 Q60 67 65 63" stroke="#0B1220" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      )}

      {/* Spotify-green headphones (listening / cool) */}
      {showHeadphones && (
        <g>
          <path
            d="M27 44 C27 14, 93 14, 93 44"
            stroke="url(#headphoneGradient)"
            strokeWidth="6.5"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="16" y="38" width="14" height="21" rx="7" fill="url(#headphoneGradient)" />
          <rect x="20.5" y="42.5" width="5" height="12" rx="2.5" fill="#052E16" />
          <rect x="90" y="38" width="14" height="21" rx="7" fill="url(#headphoneGradient)" />
          <rect x="94.5" y="42.5" width="5" height="12" rx="2.5" fill="#052E16" />
        </g>
      )}
    </svg>
  );
}
