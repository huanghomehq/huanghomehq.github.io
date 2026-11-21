/* Picture library: simple, calm SVG drawings. Each returns markup for viewBox 0 0 100 100. */
(function () {
  const S = (inner) => '<svg viewBox="0 0 100 100" aria-hidden="true">' + inner + '</svg>';
  const ink = '#1F3B39';
  const P = {
    apple: '<path d="M50 30 C50 18 56 12 64 10" stroke="#6B4F2E" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M52 24 C62 14 74 18 76 22 C68 28 58 28 52 24 Z" fill="#7E9A4F"/><circle cx="50" cy="60" r="32" fill="#C9573C"/>',
    acorn: '<path d="M30 46 C30 74 44 88 50 88 C56 88 70 74 70 46 Z" fill="#B07A45"/><path d="M24 46 C24 30 76 30 76 46 Z" fill="#6B4F2E"/><path d="M50 32 V22" stroke="#6B4F2E" stroke-width="5" stroke-linecap="round"/>',
    leaf: '<path d="M18 82 C18 40 45 16 84 16 C84 55 60 82 18 82 Z" fill="#C98A2E"/><path d="M18 82 L64 36" stroke="#7A5418" stroke-width="4" stroke-linecap="round"/>',
    pumpkin: '<path d="M48 26 L52 26 L56 12 L48 12 Z" fill="#6B4F2E"/><ellipse cx="34" cy="58" rx="22" ry="28" fill="#D9762E"/><ellipse cx="66" cy="58" rx="22" ry="28" fill="#D9762E"/><ellipse cx="50" cy="58" rx="19" ry="31" fill="#E08A3C"/>',
    sun: '<g fill="none" stroke="#D9A21E" stroke-width="6" stroke-linecap="round"><circle cx="50" cy="50" r="20" fill="#F2C46B"/><path d="M50 10v10M50 80v10M10 50h10M80 50h10M22 22l7 7M71 71l7 7M78 22l-7 7M29 71l-7 7"/></g>',
    cat: '<path d="M22 40 L26 12 L42 28 Z M78 40 L74 12 L58 28 Z" fill="#E3B341"/><circle cx="50" cy="55" r="32" fill="#E3B341"/><circle cx="39" cy="50" r="4" fill="' + ink + '"/><circle cx="61" cy="50" r="4" fill="' + ink + '"/><path d="M46 62 L50 66 L54 62" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/><path d="M30 62 H14 M30 67 H16 M70 62 H86 M70 67 H84" stroke="' + ink + '" stroke-width="2" stroke-linecap="round"/>',
    hat: '<path d="M28 70 C28 34 72 34 72 70 Z" fill="#4A6FA5"/><rect x="16" y="66" width="68" height="12" rx="6" fill="#2F4F7F"/><circle cx="50" cy="32" r="8" fill="#E3B341"/>',
    cup: '<path d="M24 30 H70 L64 82 H30 Z" fill="#C9573C"/><path d="M70 40 C88 40 88 64 67 64" fill="none" stroke="#C9573C" stroke-width="8"/>',
    car: '<path d="M14 62 L22 44 C24 40 28 38 32 38 H62 C66 38 70 40 73 44 L84 56 H88 C91 56 92 58 92 61 V68 H12 V64 Z" fill="#C9473A"/><path d="M30 44 H48 V54 H25 Z M53 44 H64 L72 54 H53 Z" fill="#DCE6F2"/><circle cx="30" cy="70" r="9" fill="' + ink + '"/><circle cx="72" cy="70" r="9" fill="' + ink + '"/>',
    star: '<path d="M50 6 L62 37 L95 38 L69 58 L79 91 L50 72 L21 91 L31 58 L5 38 L38 37 Z" fill="#E3B341"/>',
    ball: '<circle cx="50" cy="50" r="38" fill="#4A6FA5"/><path d="M14 44 C40 56 60 56 86 44 M50 12 C40 40 40 60 50 88" fill="none" stroke="#FFFFFF" stroke-width="5"/>',
    tree: '<rect x="44" y="56" width="12" height="34" rx="3" fill="#8A5A33"/><circle cx="50" cy="40" r="28" fill="#7E9A4F"/><circle cx="34" cy="52" r="16" fill="#6E8A43"/><circle cx="66" cy="52" r="16" fill="#6E8A43"/>',
    bee: '<ellipse cx="38" cy="36" rx="14" ry="10" fill="#DCE6F2"/><ellipse cx="58" cy="34" rx="14" ry="10" fill="#DCE6F2"/><ellipse cx="50" cy="58" rx="30" ry="22" fill="#E3B341"/><path d="M40 38 V78 M56 37 V79" stroke="' + ink + '" stroke-width="7"/><circle cx="74" cy="54" r="3.5" fill="' + ink + '"/>',
    sock: '<path d="M38 10 H64 V58 L80 70 C88 76 82 92 70 88 L36 74 C30 72 38 60 38 54 Z" fill="#C9573C"/><rect x="38" y="10" width="26" height="12" fill="#E8A08A"/>',
    moon: '<path d="M62 12 C38 14 22 32 22 54 C22 76 40 92 62 90 C46 82 38 68 38 52 C38 36 46 22 62 12 Z" fill="#E3B341"/>',
    spoon: '<ellipse cx="50" cy="28" rx="16" ry="20" fill="#9AABA7"/><rect x="46" y="44" width="8" height="46" rx="4" fill="#9AABA7"/>',
    fish: '<path d="M16 50 C30 28 62 28 74 50 C62 72 30 72 16 50 Z" fill="#4A6FA5"/><path d="M72 50 L92 34 V66 Z" fill="#4A6FA5"/><circle cx="32" cy="46" r="4" fill="#FFFFFF"/>',
    dish: '<ellipse cx="50" cy="58" rx="40" ry="16" fill="#DCE6F2"/><ellipse cx="50" cy="54" rx="28" ry="9" fill="#FFFFFF"/>',
    bus: '<rect x="10" y="26" width="80" height="46" rx="10" fill="#E3B341"/><rect x="18" y="34" width="18" height="14" rx="3" fill="#FFFFFF"/><rect x="41" y="34" width="18" height="14" rx="3" fill="#FFFFFF"/><rect x="64" y="34" width="18" height="14" rx="3" fill="#FFFFFF"/><circle cx="30" cy="74" r="9" fill="' + ink + '"/><circle cx="70" cy="74" r="9" fill="' + ink + '"/>',
    scarecrow: '<rect x="47" y="40" width="6" height="56" fill="#8A5A33"/><path d="M12 52 H88" stroke="#8A5A33" stroke-width="6" stroke-linecap="round"/><path d="M12 52 l-6 -5 M12 52 l-6 5 M88 52 l6 -5 M88 52 l6 5" stroke="#D9A21E" stroke-width="3" stroke-linecap="round"/><path d="M30 44 H70 L66 76 H34 Z" fill="#8A6FB0"/><rect x="38" y="54" width="8" height="8" fill="#C9473A"/><circle cx="50" cy="31" r="14" fill="#F2D27E"/><circle cx="45" cy="30" r="2" fill="#1F3B39"/><circle cx="55" cy="30" r="2" fill="#1F3B39"/><path d="M44 36 C48 39 52 39 56 36" fill="none" stroke="#1F3B39" stroke-width="2" stroke-linecap="round"/><path d="M30 21 H70 L58 3 H42 Z" fill="#8A5A33"/><rect x="26" y="18" width="48" height="5" rx="2" fill="#6B4F2E"/>',
    hen: '<ellipse cx="46" cy="60" rx="30" ry="22" fill="#B4533A"/><path d="M18 52 C8 40 14 30 24 44 Z" fill="#8A3B28"/><circle cx="70" cy="38" r="14" fill="#B4533A"/><path d="M63 25 c2 -7 6 -7 7 0 c2 -7 6 -7 7 0 Z" fill="#C9473A"/><path d="M83 36 L95 41 L83 46 Z" fill="#E3B341"/><circle cx="74" cy="35" r="2.5" fill="#1F3B39"/><path d="M40 80 V93 M54 80 V93" stroke="#E3B341" stroke-width="4" stroke-linecap="round"/>',
    chick: '<circle cx="48" cy="62" r="24" fill="#F2D27E"/><circle cx="62" cy="38" r="15" fill="#F2D27E"/><path d="M76 37 L88 41 L76 45 Z" fill="#E08A3C"/><circle cx="66" cy="35" r="2.5" fill="#1F3B39"/><path d="M42 84 V94 M54 84 V94" stroke="#E08A3C" stroke-width="4" stroke-linecap="round"/>',
    pig: '<ellipse cx="46" cy="58" rx="34" ry="24" fill="#E8A0B4"/><circle cx="76" cy="46" r="17" fill="#E8A0B4"/><ellipse cx="89" cy="51" rx="7" ry="6" fill="#D98299"/><circle cx="87" cy="50" r="1.5" fill="#1F3B39"/><circle cx="91" cy="50" r="1.5" fill="#1F3B39"/><circle cx="77" cy="40" r="2.5" fill="#1F3B39"/><path d="M68 32 L72 20 L80 31 Z" fill="#D98299"/><path d="M26 78 V93 M40 80 V93 M56 80 V93 M68 78 V93" stroke="#D98299" stroke-width="7" stroke-linecap="round"/><path d="M12 52 c-8 -4 -4 -12 2 -6" stroke="#D98299" stroke-width="3" fill="none"/>',
    dog: '<ellipse cx="44" cy="60" rx="30" ry="18" fill="#B07A45"/><circle cx="74" cy="44" r="17" fill="#B07A45"/><path d="M64 32 C56 40 56 54 62 58 C66 50 68 40 64 32 Z" fill="#6B4F2E"/><circle cx="79" cy="41" r="2.5" fill="#1F3B39"/><circle cx="90" cy="48" r="4" fill="#1F3B39"/><path d="M24 74 V91 M36 76 V91 M52 76 V91 M64 74 V91" stroke="#B07A45" stroke-width="6" stroke-linecap="round"/><path d="M14 56 C6 48 8 40 12 38" stroke="#B07A45" stroke-width="5" fill="none" stroke-linecap="round"/>',
    wheat: '<g stroke="#B88A2E" stroke-width="2.5" stroke-linecap="round" fill="#E3B341"><path d="M50 96 V20" fill="none"/><ellipse cx="43" cy="32" rx="5" ry="9" transform="rotate(-25 43 32)"/><ellipse cx="57" cy="32" rx="5" ry="9" transform="rotate(25 57 32)"/><ellipse cx="43" cy="48" rx="5" ry="9" transform="rotate(-25 43 48)"/><ellipse cx="57" cy="48" rx="5" ry="9" transform="rotate(25 57 48)"/><ellipse cx="50" cy="16" rx="5" ry="9"/></g>',
    seeds: '<g fill="#B88A2E"><ellipse cx="34" cy="70" rx="4" ry="6"/><ellipse cx="50" cy="64" rx="4" ry="6"/><ellipse cx="64" cy="72" rx="4" ry="6"/><ellipse cx="44" cy="80" rx="4" ry="6"/><ellipse cx="58" cy="84" rx="4" ry="6"/></g>',
    bread: '<path d="M14 62 C14 34 86 34 86 62 V80 H14 Z" fill="#D9A45A"/><path d="M30 48 L36 58 M48 44 L54 54 M66 48 L72 58" stroke="#B07A45" stroke-width="4" stroke-linecap="round"/>',
    house: '<path d="M12 48 L50 14 L88 48 Z" fill="#C9473A"/><rect x="20" y="46" width="60" height="46" fill="#F2D27E"/><rect x="42" y="62" width="16" height="30" fill="#8A5A33"/><rect x="27" y="54" width="10" height="10" fill="#DCE6F2"/><rect x="63" y="54" width="10" height="10" fill="#DCE6F2"/>',
    bed: '<rect x="8" y="52" width="84" height="24" rx="6" fill="#4A6FA5"/><rect x="8" y="38" width="10" height="50" rx="3" fill="#8A5A33"/><rect x="82" y="54" width="10" height="34" rx="3" fill="#8A5A33"/><ellipse cx="30" cy="50" rx="12" ry="7" fill="#FFFFFF"/>',
    turtle: '<ellipse cx="46" cy="60" rx="30" ry="20" fill="#7E9A4F"/><path d="M28 58 L46 46 L64 58 L46 68 Z" fill="none" stroke="#5E7A35" stroke-width="3"/><circle cx="82" cy="62" r="11" fill="#A9C27A"/><circle cx="86" cy="59" r="2" fill="#1F3B39"/><ellipse cx="28" cy="80" rx="8" ry="5" fill="#A9C27A"/><ellipse cx="64" cy="80" rx="8" ry="5" fill="#A9C27A"/>',
    rabbit: '<ellipse cx="44" cy="66" rx="26" ry="20" fill="#C8D3CF"/><circle cx="70" cy="50" r="15" fill="#C8D3CF"/><ellipse cx="65" cy="22" rx="5" ry="16" fill="#C8D3CF"/><ellipse cx="78" cy="24" rx="5" ry="16" fill="#C8D3CF" transform="rotate(14 78 24)"/><ellipse cx="65" cy="22" rx="2" ry="10" fill="#E8A0B4"/><circle cx="74" cy="47" r="2.5" fill="#1F3B39"/><circle cx="84" cy="53" r="2.5" fill="#E8A0B4"/><circle cx="18" cy="62" r="7" fill="#FFFFFF"/>',
    turkey: '<ellipse cx="30" cy="40" rx="10" ry="24" fill="#7E9A4F" transform="rotate(-40 30 40)"/><ellipse cx="50" cy="30" rx="10" ry="24" fill="#EBC34F"/><ellipse cx="70" cy="40" rx="10" ry="24" fill="#E08A3C" transform="rotate(40 70 40)"/><ellipse cx="50" cy="66" rx="22" ry="24" fill="#8A5A33"/><circle cx="50" cy="40" r="13" fill="#8A5A33"/><path d="M46 44 L54 44 L50 52 Z" fill="#E08A3C"/><circle cx="45" cy="37" r="2.5" fill="#1F3B39"/><circle cx="55" cy="37" r="2.5" fill="#1F3B39"/>',
    cloud: '<path d="M22 66 C8 66 8 46 24 46 C26 30 48 28 54 42 C64 32 84 38 80 54 C92 56 90 72 78 72 H26 C18 72 16 66 22 66 Z" fill="#FFFFFF"/>',
    flower: '<path d="M50 94 V50" stroke="#7E9A4F" stroke-width="4"/><g fill="#E89AC7"><circle cx="50" cy="30" r="10"/><circle cx="64" cy="40" r="10"/><circle cx="58" cy="56" r="10"/><circle cx="42" cy="56" r="10"/><circle cx="36" cy="40" r="10"/></g><circle cx="50" cy="44" r="8" fill="#EBC34F"/>',
    book: '<path d="M50 26 C38 18 22 18 12 22 V80 C22 76 38 76 50 84 Z" fill="#4A6FA5"/><path d="M50 26 C62 18 78 18 88 22 V80 C78 76 62 76 50 84 Z" fill="#6B8DBF"/><path d="M50 26 V84" stroke="#2F4F7F" stroke-width="2"/>',
    kid: '<circle cx="50" cy="26" r="16" fill="#E9BE96"/><path d="M34 22 C36 6 64 6 66 22 C58 16 42 16 34 22 Z" fill="#2B211B"/><circle cx="44" cy="26" r="2" fill="#1F3B39"/><circle cx="56" cy="26" r="2" fill="#1F3B39"/><path d="M45 32 C48 35 52 35 55 32" stroke="#1F3B39" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="36" y="42" width="28" height="30" rx="8" fill="#E08A3C"/><path d="M37 48 L25 60 M63 48 L75 60" stroke="#E9BE96" stroke-width="6" stroke-linecap="round"/><path d="M43 72 V93 M57 72 V93" stroke="#4A6FA5" stroke-width="8" stroke-linecap="round"/>',
    kidsleep: '<circle cx="50" cy="26" r="16" fill="#E9BE96"/><path d="M34 22 C36 6 64 6 66 22 C58 16 42 16 34 22 Z" fill="#2B211B"/><path d="M41 27 C43 29 46 29 48 27 M52 27 C54 29 57 29 59 27" stroke="#1F3B39" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="36" y="42" width="28" height="30" rx="8" fill="#8A6FB0"/><path d="M37 48 L25 60 M63 48 L75 60" stroke="#E9BE96" stroke-width="6" stroke-linecap="round"/><path d="M43 72 V93 M57 72 V93" stroke="#8A6FB0" stroke-width="8" stroke-linecap="round"/>',
    block: '<rect x="16" y="16" width="68" height="68" rx="10" fill="#4A6FA5"/><rect x="28" y="28" width="44" height="44" rx="6" fill="none" stroke="#DCE6F2" stroke-width="5"/>',
    basket: '<path d="M22 34 C22 6 78 6 78 34" fill="none" stroke="#8A5A33" stroke-width="6" stroke-linecap="round"/><path d="M8 40 H92 L80 88 H20 Z" fill="#C99A62"/><path d="M14 58 H86 M18 74 H82" stroke="#A97A45" stroke-width="4"/>'
  };
  // Feeling faces
  const FACE = {
    happy: { eye: 5, brow: '', mouth: 'M30 62 C40 76 60 76 70 62' },
    sad: { eye: 5, brow: 'M26 30 L42 34 M74 30 L58 34', mouth: 'M32 72 C42 60 58 60 68 72' },
    mad: { eye: 5, brow: 'M26 30 L42 38 M74 30 L58 38', mouth: 'M34 68 H66' },
    scared: { eye: 8, brow: 'M28 26 L42 24 M72 26 L58 24', mouth: 'M42 66 a8 9 0 1 0 16 0 a8 9 0 1 0 -16 0' }
  };
  function face(kind, skin) {
    const f = FACE[kind];
    return S('<circle cx="50" cy="50" r="44" fill="' + (skin || '#F2D27E') + '"/>' +
      '<circle cx="35" cy="44" r="' + f.eye + '" fill="' + ink + '"/><circle cx="65" cy="44" r="' + f.eye + '" fill="' + ink + '"/>' +
      (f.brow ? '<path d="' + f.brow + '" stroke="' + ink + '" stroke-width="4" stroke-linecap="round" fill="none"/>' : '') +
      '<path d="' + f.mouth + '" stroke="' + ink + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      (kind === 'sad' ? '<path d="M68 52 C64 60 64 64 68 66 C72 64 72 60 68 52 Z" fill="#7FB3D5"/>' : ''));
  }
  // Little scene pictures for the feelings game
  const SCENE = {
    icecream: '<rect x="4" y="86" width="92" height="4" rx="2" fill="#D5DED9"/><circle cx="40" cy="76" r="12" fill="#E8A0B4"/><path d="M46 70 L78 56 L70 82 Z" fill="#D9A45A"/>',
    cake: '<rect x="20" y="48" width="60" height="36" rx="6" fill="#E8A0B4"/><rect x="20" y="48" width="60" height="10" rx="5" fill="#FFFFFF"/><rect x="47" y="30" width="6" height="18" fill="#4A6FA5"/><path d="M50 18 C46 24 46 28 50 30 C54 28 54 24 50 18 Z" fill="#E3B341"/>',
    tower: '<rect x="14" y="66" width="22" height="22" rx="3" fill="#4A6FA5"/><rect x="40" y="70" width="22" height="18" rx="3" fill="#C9473A" transform="rotate(14 51 79)"/><rect x="62" y="40" width="22" height="22" rx="3" fill="#E3B341" transform="rotate(-24 73 51)"/><path d="M60 30 l6 -8 M70 32 l8 -4" stroke="#9AABA7" stroke-width="3" stroke-linecap="round"/>',
    storm: '<path d="M22 50 C10 50 10 32 24 32 C26 18 46 16 52 28 C62 20 80 26 76 42 C88 44 86 60 74 60 H26 C18 60 16 52 22 50 Z" fill="#9AABA7"/><path d="M50 60 L40 78 H52 L44 96" fill="none" stroke="#E3B341" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>'
  };
  window.ART = {
    has: (k) => !!P[k],
    pic: (k) => S(P[k] || P.ball),
    face: face,
    scene: (k) => S(SCENE[k] || ''),
    icon: {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
      speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
      next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
      lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5v15l12-7.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
      star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
      restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 3.5v5h5"/></svg>',
      takeOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13h18l-2.5 8h-13z"/><path d="M12 10V2"/><path d="M8 6l4-4 4 4"/></svg>',
      bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
      headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="5" height="7" rx="2" fill="currentColor"/><rect x="16" y="14" width="5" height="7" rx="2" fill="currentColor"/></svg>',
      pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.5" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.5" fill="currentColor"/></svg>',
      check: '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#DCEBE8"/><path d="M30 52 L44 66 L72 36" fill="none" stroke="#2F6F6A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      moon: '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#E6E3F0"/><path d="M60 24 C44 26 34 38 34 52 C34 66 46 78 60 76 C50 70 46 62 46 50 C46 40 50 30 60 24 Z" fill="#8A86A0"/></svg>'
    }
  };
})();
