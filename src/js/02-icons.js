/*==================================================================
  ИКОНКИ «朱»: свои, рисованные (SVG 32×32), в духе Duolingo — круглые формы, 2–3 тона,
  тёмная «кромка» снизу. IC(имя, размер, класс) → строка <svg>. Без эмодзи и внешних наборов.
==================================================================*/
const ICP={
  // — навигация
  home:`<path d="M6 15h20v10.5a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 6 25.5z" fill="#ffd9a8"/><path d="M6 25h20v.5a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 6 25.5z" fill="#f5be7c"/>
    <rect x="12.5" y="19" width="7" height="10" rx="2.4" fill="#ff9600"/><path d="M2.6 15.4C7.6 13.9 11.9 10.6 14.3 6a2 2 0 0 1 3.4 0c2.4 4.6 6.7 7.9 11.7 9.4 1 .3.8 1.8-.3 1.8H2.9c-1.1 0-1.3-1.5-.3-1.8z" fill="#ff4b4b"/>
    <path d="M3.4 17.2h25.2c.9 0 1.3-.9.9-1.5H2.5c-.4.6 0 1.5.9 1.5z" fill="#d93636"/><circle cx="16" cy="4.6" r="1.8" fill="#ffc800"/>`,
  dumbbell:`<rect x="9" y="14" width="14" height="4" rx="2" fill="#afafaf"/><rect x="3" y="9" width="7" height="14" rx="3" fill="#1cb0f6"/><rect x="3" y="18" width="7" height="5" rx="2.5" fill="#1899d6"/>
    <rect x="22" y="9" width="7" height="14" rx="3" fill="#1cb0f6"/><rect x="22" y="18" width="7" height="5" rx="2.5" fill="#1899d6"/><rect x="5" y="11" width="2" height="5" rx="1" fill="#fff" opacity=".55"/><rect x="24" y="11" width="2" height="5" rx="1" fill="#fff" opacity=".55"/>`,
  book:`<rect x="5" y="4" width="21" height="25" rx="4" fill="#ce82ff"/><rect x="5" y="23" width="21" height="6" rx="3" fill="#a568cc"/><path d="M9 23.5h17v2.5H9.8a1.3 1.3 0 0 1-.8-2.5z" fill="#fff"/>
    <rect x="9" y="4" width="3" height="19" fill="#b66ee8"/><path d="M19 4h5v9l-2.5-2-2.5 2z" fill="#ff9600"/><text x="17.5" y="20" font-size="9" text-anchor="middle" fill="#fff" font-family="'Noto Sans SC',sans-serif" font-weight="700">字</text>`,
  trophy:`<path d="M9 4h14v8a7 7 0 0 1-14 0z" fill="#ffc800"/><path d="M9 9h14v3a7 7 0 0 1-14 0z" fill="#ffb100"/><path d="M9 6H5.5a1.5 1.5 0 0 0-1.5 1.6C4.3 11.6 6.6 14 9.6 14.6M23 6h3.5A1.5 1.5 0 0 1 28 7.6c-.3 4-2.6 6.4-5.6 7" fill="none" stroke="#ffc800" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="14" y="18" width="4" height="5" fill="#e5a800"/><rect x="9" y="23" width="14" height="6" rx="2.5" fill="#ff9600"/><rect x="9" y="26" width="14" height="3" rx="1.5" fill="#e07c00"/><rect x="12" y="6" width="2.4" height="7" rx="1.2" fill="#fff" opacity=".6"/>`,
  gear:'GEAR',
  // — шапка
  flame:`<path d="M16 2.5c1.3 4.4 7.4 7.6 9 13.4C26.9 23 22.2 29.5 16 29.5S5.1 23 7 15.9c.9-3.3 3.3-5 4.2-7.6.5 2.2 1.7 3.4 2.9 4C13.7 8.6 14.6 5.4 16 2.5z" fill="#ff9600"/>
    <path d="M16 13.5c.8 2.9 4.9 4.8 5.3 8.6.4 3.8-2.3 6.4-5.3 6.4s-5.8-2.6-5.3-6.4c.3-2.4 2-3.4 2.7-5.1.6 1.4 1.3 2 2.1 2.3-.2-2 .1-3.9.5-5.8z" fill="#ffc800"/>`,
  flameOff:`<path d="M16 2.5c1.3 4.4 7.4 7.6 9 13.4C26.9 23 22.2 29.5 16 29.5S5.1 23 7 15.9c.9-3.3 3.3-5 4.2-7.6.5 2.2 1.7 3.4 2.9 4C13.7 8.6 14.6 5.4 16 2.5z" fill="#e5e5e5"/>
    <path d="M16 13.5c.8 2.9 4.9 4.8 5.3 8.6.4 3.8-2.3 6.4-5.3 6.4s-5.8-2.6-5.3-6.4c.3-2.4 2-3.4 2.7-5.1.6 1.4 1.3 2 2.1 2.3-.2-2 .1-3.9.5-5.8z" fill="#cfcfcf"/>`,
  ice:`<rect x="4" y="5" width="24" height="23" rx="6" fill="#84d8ff"/><rect x="4" y="21" width="24" height="7" rx="3.5" fill="#49c0f8"/><path d="M8 10.5a2.5 2.5 0 0 1 2.5-2.5H17" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <circle cx="21" cy="9" r="1.4" fill="#fff"/><path d="M21 15.5v6M18.4 17l5.2 3M18.4 20l5.2-3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>`,
  iceOff:`<rect x="4" y="5" width="24" height="23" rx="6" fill="#e5e5e5"/><rect x="4" y="21" width="24" height="7" rx="3.5" fill="#d0d0d0"/><path d="M8 10.5a2.5 2.5 0 0 1 2.5-2.5H17" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
  bolt:`<path d="M18.5 2.5 6.8 17.2c-.6.8-.1 1.8.9 1.8h6.6l-2 10.1c-.2.9.9 1.4 1.5.7L25.2 15c.6-.8.1-1.8-.9-1.8h-6.5l2.4-10c.2-.9-1-1.4-1.7-.7z" fill="#ffc800"/><path d="M14.3 19 12.3 29c-.1.6.3 1 .7 1L14.9 19z" fill="#e5a800"/>`,
  // — узлы пути и общие
  star:`<path d="M16 3.6c.6 0 1.1.3 1.4.9l3 6.2 6.8 1c1.3.2 1.8 1.8.9 2.7l-4.9 4.8 1.2 6.8c.2 1.3-1.1 2.3-2.3 1.7L16 24.5l-6.1 3.2c-1.2.6-2.5-.4-2.3-1.7l1.2-6.8-4.9-4.8c-.9-.9-.4-2.5.9-2.7l6.8-1 3-6.2c.3-.6.8-.9 1.4-.9z" fill="currentColor"/>`,
  check:`<path d="M7 16.5l6 6L25.5 10" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  checkOk:`<circle cx="16" cy="16" r="14" fill="#58cc02"/><path d="M9.5 16.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  xBad:`<circle cx="16" cy="16" r="14" fill="#ff4b4b"/><path d="M11 11l10 10m0-10L11 21" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>`,
  lock:`<path d="M10 14v-3.5a6 6 0 0 1 12 0V14" fill="none" stroke="currentColor" stroke-width="3.4"/><rect x="6.5" y="13" width="19" height="15" rx="4.5" fill="currentColor"/><circle cx="16" cy="19.5" r="2.2" fill="#fff" opacity=".8"/><rect x="15" y="20" width="2" height="4" rx="1" fill="#fff" opacity=".8"/>`,
  lockC:`<path d="M10 14v-3.5a6 6 0 0 1 12 0V14" fill="none" stroke="#afafaf" stroke-width="3.4"/><rect x="6.5" y="13" width="19" height="15" rx="4.5" fill="#ffc800"/><rect x="6.5" y="23" width="19" height="5" rx="2.5" fill="#e5a800"/><circle cx="16" cy="19" r="2.2" fill="#a06d00"/>`,
  chest:`<rect x="3.5" y="12" width="25" height="16" rx="3.5" fill="#c97a2c"/><path d="M3.5 13.5A8.5 8.5 0 0 1 12 5h8a8.5 8.5 0 0 1 8.5 8.5V15h-25z" fill="#e8963e"/><rect x="3.5" y="15" width="25" height="3" fill="#ffc800"/><rect x="3.5" y="24" width="25" height="4" rx="2" fill="#a8621f"/>
    <rect x="13" y="13" width="6" height="8" rx="2" fill="#ffc800"/><rect x="15" y="16" width="2" height="3" rx="1" fill="#a06d00"/><rect x="8" y="5.5" width="3" height="22" fill="#ffc800" opacity=".55"/><rect x="21" y="5.5" width="3" height="22" fill="#ffc800" opacity=".55"/>`,
  crown:`<path d="M4 11.5c0-1.1 1.3-1.7 2.1-.9l4.4 4.2 4.1-7.4c.6-1.1 2.2-1.1 2.8 0l4.1 7.4 4.4-4.2c.8-.8 2.1-.2 2.1.9V24a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#ffc800"/><path d="M4 22h24v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#e5a800"/>
    <circle cx="10" cy="19" r="1.8" fill="#ff4b4b"/><circle cx="16" cy="18" r="2.1" fill="#1cb0f6"/><circle cx="22" cy="19" r="1.8" fill="#ff4b4b"/>`,
  pin:`<path d="M16 29.5c-1 0-9-8.4-9-15a9 9 0 0 1 18 0c0 6.6-8 15-9 15z" fill="#ff4b4b"/><circle cx="16" cy="14" r="3.6" fill="#fff"/>`,
  suitcase:`<rect x="11" y="4.5" width="10" height="6" rx="2.5" fill="none" stroke="#a8621f" stroke-width="2.4"/><rect x="4" y="9" width="24" height="18" rx="4" fill="#1cb0f6"/><rect x="4" y="22" width="24" height="5" rx="2.5" fill="#1899d6"/>
    <rect x="10" y="9" width="2.5" height="18" fill="#ffc800"/><rect x="19.5" y="9" width="2.5" height="18" fill="#ffc800"/>`,
  sparkle:`<path d="M15 3.5c.4 0 .8.3.9.7l1.4 5.4a6 6 0 0 0 4.3 4.3l5.4 1.4c.9.2.9 1.6 0 1.8l-5.4 1.4a6 6 0 0 0-4.3 4.3l-1.4 5.4c-.2.9-1.6.9-1.8 0l-1.4-5.4a6 6 0 0 0-4.3-4.3l-5.4-1.4c-.9-.2-.9-1.6 0-1.8l5.4-1.4a6 6 0 0 0 4.3-4.3l1.4-5.4c.1-.4.5-.7.9-.7z" fill="currentColor"/><circle cx="26" cy="6" r="2.2" fill="currentColor" opacity=".7"/>`,
  sparkleC:`<path d="M15 3.5c.4 0 .8.3.9.7l1.4 5.4a6 6 0 0 0 4.3 4.3l5.4 1.4c.9.2.9 1.6 0 1.8l-5.4 1.4a6 6 0 0 0-4.3 4.3l-1.4 5.4c-.2.9-1.6.9-1.8 0l-1.4-5.4a6 6 0 0 0-4.3-4.3l-5.4-1.4c-.9-.2-.9-1.6 0-1.8l5.4-1.4a6 6 0 0 0 4.3-4.3l1.4-5.4c.1-.4.5-.7.9-.7z" fill="#ffc800"/><circle cx="26" cy="6" r="2.2" fill="#ff9600"/>`,
  // «разбор»: знак-квадрат, разделённый на ключ (оранжевый) и фонетик (голубой)
  split:`<rect x="3" y="4" width="11" height="24" rx="3.5" fill="#ff9600"/><rect x="3" y="23" width="11" height="5" rx="2.5" fill="#e07c00"/><rect x="18" y="4" width="11" height="24" rx="3.5" fill="#1cb0f6"/><rect x="18" y="23" width="11" height="5" rx="2.5" fill="#1899d6"/>
    <text x="8.5" y="19.5" font-size="11" text-anchor="middle" fill="#fff" font-family="'Noto Sans SC',sans-serif" font-weight="700">讠</text><text x="23.5" y="19.5" font-size="10" text-anchor="middle" fill="#fff" font-family="'Noto Sans SC',sans-serif" font-weight="700">射</text>`,
  splitW:`<path d="M6 8.5h5.4a3.4 3.4 0 1 1 6.8 0h5.3v5.3a3.4 3.4 0 1 1 0 6.8v5.4h-5.3a3.4 3.4 0 1 0-6.8 0H6v-5.4a3.4 3.4 0 1 0 0-6.8z" fill="currentColor"/>`,
  chat:`<path d="M5 5h15a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-7l-5 4v-4H5a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z" fill="#ff9600"/><path d="M14 13h13a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-1v4l-5-4h-7a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z" fill="#1cb0f6"/>
    <text x="10.5" y="15.6" font-size="7.5" text-anchor="middle" fill="#fff" font-weight="900" font-family="Nunito,sans-serif">RU</text><text x="20.5" y="23.8" font-size="8.5" text-anchor="middle" fill="#fff" font-family="'Noto Sans SC',sans-serif" font-weight="700">中</text>`,
  chatW:`<path d="M7 5h18a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-8l-6 5v-5H7a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z" fill="currentColor"/><circle cx="10" cy="14" r="2" fill="#fff" opacity=".85"/><circle cx="16" cy="14" r="2" fill="#fff" opacity=".85"/><circle cx="22" cy="14" r="2" fill="#fff" opacity=".85"/>`,
  clipboard:`<rect x="5" y="5" width="22" height="25" rx="4" fill="#e8963e"/><rect x="8" y="8" width="16" height="19" rx="2" fill="#fff"/><rect x="11" y="3" width="10" height="5" rx="2" fill="#a8621f"/>
    <path d="M11 14h10M11 18h10M11 22h6" stroke="#afafaf" stroke-width="2" stroke-linecap="round"/>`,
  pencil:`<path d="M21.5 4.8a3 3 0 0 1 4.2 0l1.5 1.5a3 3 0 0 1 0 4.2L12 25.7 5.5 27c-.6.1-1.1-.4-1-1L5.8 19.5z" fill="#ffc800"/><path d="M5.8 19.5 12 25.7l-6.5 1.3c-.6.1-1.1-.4-1-1z" fill="#ffd9a8"/><path d="M4.5 26 5 23.3 7.7 26z" fill="#4b4b4b"/>
    <path d="M19 7.3 24.7 13" stroke="#ff4b4b" stroke-width="3"/><path d="M8.5 22.5 20 11" stroke="#e5a800" stroke-width="1.6" stroke-linecap="round"/>`,
  pencilW:`<path d="M21.5 4.8a3 3 0 0 1 4.2 0l1.5 1.5a3 3 0 0 1 0 4.2L12 25.7 5.5 27c-.6.1-1.1-.4-1-1L5.8 19.5z" fill="currentColor"/>`,
  cards:`<rect x="9" y="3" width="17" height="22" rx="3.5" fill="#84d8ff" transform="rotate(10 17 14)"/><rect x="5" y="6" width="17" height="23" rx="3.5" fill="#1cb0f6"/><rect x="5" y="24" width="17" height="5" rx="2.5" fill="#1899d6"/>
    <text x="13.5" y="21" font-size="11" text-anchor="middle" fill="#fff" font-family="'Noto Sans SC',sans-serif" font-weight="700">你</text>`,
  plus:`<circle cx="16" cy="16" r="13" fill="#ff9600"/><path d="M16 10v12M10 16h12" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>`,
  cycle:`<path d="M24.5 12.5a9.5 9.5 0 0 0-16.8-2.3" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/><path d="M6 5.5v6h6" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7.5 19.5a9.5 9.5 0 0 0 16.8 2.3" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/><path d="M26 26.5v-6h-6" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  cycleC:`<path d="M24.5 12.5a9.5 9.5 0 0 0-16.8-2.3" fill="none" stroke="#ff9600" stroke-width="3.6" stroke-linecap="round"/><path d="M6 5.5v6h6" fill="none" stroke="#ff9600" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7.5 19.5a9.5 9.5 0 0 0 16.8 2.3" fill="none" stroke="#1cb0f6" stroke-width="3.6" stroke-linecap="round"/><path d="M26 26.5v-6h-6" fill="none" stroke="#1cb0f6" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  speaker:`<path d="M4 12.5a2 2 0 0 1 2-2h4l6.4-5.3c1-.8 2.6-.1 2.6 1.2v19.2c0 1.3-1.6 2-2.6 1.2L10 21.5H6a2 2 0 0 1-2-2z" fill="currentColor"/><path d="M22.5 11.5a6.5 6.5 0 0 1 0 9M25.8 8a11.5 11.5 0 0 1 0 16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>`,
  turtle:`<path d="M5 22a11 11 0 0 1 22 0z" fill="#e8963e"/><path d="M5 22h22v1.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="#a8621f"/><path d="M11 12.5 16 17l5-4.5M16 17v5M8 19.5l3-1.8M24 19.5l-3-1.8" stroke="#ffc800" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <circle cx="28" cy="18.5" r="3.4" fill="#ffc07a"/><circle cx="29" cy="17.6" r=".9" fill="#4b4b4b"/><rect x="7.5" y="24" width="4" height="4.5" rx="2" fill="#ffc07a"/><rect x="20.5" y="24" width="4" height="4.5" rx="2" fill="#ffc07a"/>`,
  headphones:`<path d="M5 19v-3a11 11 0 0 1 22 0v3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><rect x="3" y="17" width="7" height="11" rx="3.5" fill="currentColor"/><rect x="22" y="17" width="7" height="11" rx="3.5" fill="currentColor"/>`,
  warn:`<path d="M14.3 4.6a2 2 0 0 1 3.4 0l11 19.4a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3z" fill="#ffc800"/><rect x="14.5" y="11" width="3" height="9" rx="1.5" fill="#6b4b00"/><circle cx="16" cy="23.3" r="1.8" fill="#6b4b00"/>`,
  flag:`<rect x="5" y="3" width="3" height="27" rx="1.5" fill="#afafaf"/><path d="M8 5h17.5c.9 0 1.3 1 .8 1.7L23 11l3.3 4.3c.5.7.1 1.7-.8 1.7H8z" fill="#ff4b4b"/>`,
  calendar:`<rect x="4" y="6" width="24" height="23" rx="4" fill="#fff" stroke="#e5e5e5" stroke-width="2"/><path d="M4 10a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v3H4z" fill="#ff4b4b"/><rect x="9" y="3" width="3" height="6" rx="1.5" fill="#4b4b4b"/><rect x="20" y="3" width="3" height="6" rx="1.5" fill="#4b4b4b"/>
    <text x="16" y="25.5" font-size="10" text-anchor="middle" fill="#4b4b4b" font-weight="900" font-family="Nunito,sans-serif">10</text>`,
  gem:`<path d="M9 5h14l6 7.5L16 28 3 12.5z" fill="#1cb0f6"/><path d="M3 12.5h26L16 28z" fill="#1899d6"/><path d="M9 5l3 7.5h8L23 5" fill="#84d8ff"/><path d="M12 12.5 16 28l4-15.5" fill="#49c0f8"/>`,
  sprout:`<path d="M16 29V15" stroke="#58a700" stroke-width="3" stroke-linecap="round"/><path d="M16 17C16 10 11 6 4 6c0 7 5 11 12 11z" fill="#89e219"/><path d="M16 15c0-6 4-9.5 10-9.5 0 6-4 9.5-10 9.5z" fill="#58cc02"/>`,
  leaf:`<path d="M16 29V10" stroke="#58a700" stroke-width="3" stroke-linecap="round"/><path d="M16 22c-6 0-10-3-11-8 6 0 10 3 11 8zM16 16c6 0 10-3 11-8-6 0-10 3-11 8zM16 12c-3-2-4-5-3-8.5 3 1.5 4.3 4.5 3 8.5z" fill="#58cc02"/>`,
  tree:`<rect x="14" y="18" width="4" height="11" rx="2" fill="#a8621f"/><circle cx="16" cy="11" r="8" fill="#58cc02"/><circle cx="9.5" cy="16" r="5.5" fill="#58cc02"/><circle cx="22.5" cy="16" r="5.5" fill="#58cc02"/><circle cx="13" cy="8.5" r="2.2" fill="#89e219"/>`,
  books:`<rect x="4" y="20" width="24" height="7" rx="2.5" fill="#1cb0f6"/><rect x="6" y="13" width="21" height="7" rx="2.5" fill="#ff9600"/><rect x="5" y="6" width="20" height="7" rx="2.5" fill="#ce82ff"/><path d="M8 23.5h17M10 16.5h14M8 9.5h14" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`,
  timer:`<circle cx="16" cy="18" r="11" fill="#fff" stroke="#1cb0f6" stroke-width="3"/><rect x="13" y="2.5" width="6" height="3.5" rx="1.5" fill="#1cb0f6"/><path d="M16 18V12" stroke="#4b4b4b" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="18" r="2" fill="#ff4b4b"/>`,
  x:`<path d="M8 8l16 16M24 8 8 24" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>`,
  back:`<path d="M20 6 10 16l10 10" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  chev:`<path d="M12 6l10 10-10 10" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  play:`<path d="M9 5.5c0-1.6 1.7-2.6 3.1-1.8l14.5 9.1c1.3.8 1.3 2.7 0 3.5L12.1 25.4c-1.4.9-3.1-.1-3.1-1.8z" fill="currentColor"/>`,
  undo:`<path d="M10 7 4 13l6 6" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 13h13a8 8 0 0 1 0 16h-4" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`,
  brush:`<path d="M26.5 3.5c.9.9-7.4 11.4-10.2 14.2l-2.1-2.1C17 12.9 25.6 2.6 26.5 3.5z" fill="#a8621f"/><path d="M13.6 16.1l2.3 2.3c.6 4.7-3.2 8.6-10.4 8.6 2.4-1.8 1.5-4.9 3.2-7.6 1.1-1.8 3.2-3.1 4.9-3.3z" fill="#4b4b4b"/>`,
  brushW:`<path d="M26.5 3.5c.9.9-7.4 11.4-10.2 14.2l-2.1-2.1C17 12.9 25.6 2.6 26.5 3.5z" fill="currentColor" opacity=".75"/><path d="M13.6 16.1l2.3 2.3c.6 4.7-3.2 8.6-10.4 8.6 2.4-1.8 1.5-4.9 3.2-7.6 1.1-1.8 3.2-3.1 4.9-3.3z" fill="currentColor"/>`,
  eye:`<path d="M2.5 16C6 9.5 10.6 6.5 16 6.5S26 9.5 29.5 16C26 22.5 21.4 25.5 16 25.5S6 22.5 2.5 16z" fill="currentColor"/><circle cx="16" cy="16" r="5" fill="#fff"/><circle cx="16" cy="16" r="2.4" fill="currentColor"/>`,
  info:`<circle cx="16" cy="16" r="13" fill="currentColor"/><rect x="14.4" y="13.5" width="3.2" height="10" rx="1.6" fill="#fff"/><circle cx="16" cy="9.5" r="2" fill="#fff"/>`,
  target:`<circle cx="16" cy="16" r="13" fill="#ff4b4b"/><circle cx="16" cy="16" r="9" fill="#fff"/><circle cx="16" cy="16" r="5" fill="#ff4b4b"/><circle cx="16" cy="16" r="1.8" fill="#fff"/>`,
  medal:`<path d="M9 3h5l3 8h-5zM23 3h-5l-3 8h5z" fill="#1cb0f6"/><circle cx="16" cy="20" r="9" fill="#ffc800"/><circle cx="16" cy="20" r="6" fill="#ffb100"/><path d="M16 15.8l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#fff"/>`,
  moon:`<path d="M20.5 4.5a12 12 0 1 0 7 17.3A10 10 0 0 1 20.5 4.5z" fill="#ffc800"/><circle cx="25" cy="8" r="1.6" fill="#ffc800"/><circle cx="28" cy="13" r="1" fill="#ffc800"/>`,
  sun:`<circle cx="16" cy="16" r="7" fill="#ffc800"/><g stroke="#ff9600" stroke-width="2.6" stroke-linecap="round"><path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1"/></g>`,
};
// Шестерёнка строится программно: 8 зубцов
ICP.gear=(()=>{ let d=''; const R=14,r=10.6,n=8; for(let i=0;i<n*4;i++){ const a=(i/(n*4))*Math.PI*2-Math.PI/2, rr=(i%4<2)?R:r;
  d+=(i?'L':'M')+(16+rr*Math.cos(a)).toFixed(2)+' '+(16+rr*Math.sin(a)).toFixed(2); }
  return `<path d="${d}Z" fill="#afafaf" stroke="#afafaf" stroke-width="2.4" stroke-linejoin="round"/><circle cx="16" cy="16" r="8.4" fill="#cfcfcf"/><circle cx="16" cy="16" r="4.2" fill="#fff"/>`; })();
function IC(name,size,cls){ const p=ICP[name]; if(!p) return '';
  return `<svg class="ico${cls?' '+cls:''}" viewBox="0 0 32 32" width="${size||24}" height="${size||24}" aria-hidden="true">${p}</svg>`; }
// Контур тона (1 ровный высокий, 2 восходящий, 3 нисходяще-восходящий, 4 нисходящий, 5 лёгкий) — шкала 1…5 по Чжао Юаньжэню
const TONE_PATH={1:'M5 7H27',2:'M5 17C12 16 20 12 27 7',3:'M5 13C10 21 15 23 19 21S25 15 27 11',4:'M5 7C12 11 20 17 27 24',5:'M16 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0'};
function toneIcon(t,size){ const c='var(--t'+t+')';
  return `<svg class="ico tonei" viewBox="0 0 32 28" width="${size||30}" height="${Math.round((size||30)*28/32)}" aria-hidden="true">
    <path d="M3 4v20M29 4v20" stroke="#e5e5e5" stroke-width="1.5"/><path d="${TONE_PATH[t]}" fill="${t===5?c:'none'}" stroke="${c}" stroke-width="${t===5?0:4.2}" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
// Иконка по имени из набора, одиночный иероглиф — как текст (部, 考), иначе строка как есть
function icn(x,size){ return ICP[x]?IC(x,size):/^[㐀-鿿]$/.test(x||'')?`<span class="han">${x}</span>`:(x||''); }
const SPK=s=>IC('speaker',s||18), SLOW=()=>IC('turtle',22);
