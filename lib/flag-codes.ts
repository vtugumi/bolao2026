export const FIFA_TO_ISO: Record<string, string> = {
  // Grupos A-L (confirmados)
  MEX: 'mx', KOR: 'kr', RSA: 'za', PLD: '',
  CAN: 'ca', SUI: 'ch', QAT: 'qa', PLA: '',
  BRA: 'br', MAR: 'ma', SCO: 'gb-sct', HAI: 'ht',
  USA: 'us', PAR: 'py', AUS: 'au', PLC: '',
  GER: 'de', ECU: 'ec', CIV: 'ci', CUW: 'cw',
  NED: 'nl', JPN: 'jp', TUN: 'tn', PLB: '',
  BEL: 'be', IRN: 'ir', EGY: 'eg', NZL: 'nz',
  ESP: 'es', URU: 'uy', KSA: 'sa', CPV: 'cv',
  FRA: 'fr', SEN: 'sn', NOR: 'no', PI2: '',
  ARG: 'ar', AUT: 'at', ALG: 'dz', JOR: 'jo',
  POR: 'pt', COL: 'co', UZB: 'uz', PI1: '',
  ENG: 'gb-eng', CRO: 'hr', PAN: 'pa', GHA: 'gh',
  // Possiveis classificados dos playoffs
  TUR: 'tr', UKR: 'ua', WAL: 'gb-wls', GEO: 'ge',
  GRE: 'gr', IRL: 'ie', ISL: 'is', SVK: 'sk',
  SRB: 'rs', SWE: 'se', DEN: 'dk', CZE: 'cz',
  POL: 'pl', ROU: 'ro', HUN: 'hu', BUL: 'bg',
  SVN: 'si', ALB: 'al', FIN: 'fi', ITA: 'it',
  IDN: 'id', BHR: 'bh', TRI: 'tt', BFA: 'bf',
  GUI: 'gn', BEN: 'bj',
}

// flagcdn supports: w20, w40, w80, w160, w320
function nearestFlagSize(size: number): number {
  const sizes = [20, 40, 80, 160, 320];
  return sizes.reduce((prev, curr) => Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev);
}

export function getFlagUrl(fifaCode: string, size: number = 40): string {
  const iso = FIFA_TO_ISO[fifaCode]
  if (!iso) return ''
  const cdnSize = nearestFlagSize(size)
  return `https://flagcdn.com/w${cdnSize}/${iso}.png`
}
