/**
 * DataForSEO Supported Locations
 * Comprehensive list of countries supported by DataForSEO API
 */

export interface LocationOption {
  code: string;
  name: string;
  flag?: string;
}

// Helper function to get country flag emoji from country code
const getCountryFlag = (code: string): string => {
  // Convert country code to flag emoji
  // Using regional indicator symbols (A-Z = 0x1F1E6-0x1F1FF)
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const DATAFORSEO_LOCATIONS: LocationOption[] = [
  { code: 'US', name: 'United States', flag: getCountryFlag('US') },
  { code: 'GB', name: 'United Kingdom', flag: getCountryFlag('GB') },
  { code: 'CA', name: 'Canada', flag: getCountryFlag('CA') },
  { code: 'AU', name: 'Australia', flag: getCountryFlag('AU') },
  { code: 'DE', name: 'Germany', flag: getCountryFlag('DE') },
  { code: 'FR', name: 'France', flag: getCountryFlag('FR') },
  { code: 'ES', name: 'Spain', flag: getCountryFlag('ES') },
  { code: 'IT', name: 'Italy', flag: getCountryFlag('IT') },
  { code: 'NL', name: 'Netherlands', flag: getCountryFlag('NL') },
  { code: 'SE', name: 'Sweden', flag: getCountryFlag('SE') },
  { code: 'NO', name: 'Norway', flag: getCountryFlag('NO') },
  { code: 'DK', name: 'Denmark', flag: getCountryFlag('DK') },
  { code: 'FI', name: 'Finland', flag: getCountryFlag('FI') },
  { code: 'PL', name: 'Poland', flag: getCountryFlag('PL') },
  { code: 'BE', name: 'Belgium', flag: getCountryFlag('BE') },
  { code: 'CH', name: 'Switzerland', flag: getCountryFlag('CH') },
  { code: 'AT', name: 'Austria', flag: getCountryFlag('AT') },
  { code: 'IE', name: 'Ireland', flag: getCountryFlag('IE') },
  { code: 'PT', name: 'Portugal', flag: getCountryFlag('PT') },
  { code: 'GR', name: 'Greece', flag: getCountryFlag('GR') },
  { code: 'CZ', name: 'Czech Republic', flag: getCountryFlag('CZ') },
  { code: 'HU', name: 'Hungary', flag: getCountryFlag('HU') },
  { code: 'RO', name: 'Romania', flag: getCountryFlag('RO') },
  { code: 'BR', name: 'Brazil', flag: getCountryFlag('BR') },
  { code: 'MX', name: 'Mexico', flag: getCountryFlag('MX') },
  { code: 'AR', name: 'Argentina', flag: getCountryFlag('AR') },
  { code: 'CL', name: 'Chile', flag: getCountryFlag('CL') },
  { code: 'CO', name: 'Colombia', flag: getCountryFlag('CO') },
  { code: 'PE', name: 'Peru', flag: getCountryFlag('PE') },
  { code: 'IN', name: 'India', flag: getCountryFlag('IN') },
  { code: 'CN', name: 'China', flag: getCountryFlag('CN') },
  { code: 'JP', name: 'Japan', flag: getCountryFlag('JP') },
  { code: 'KR', name: 'South Korea', flag: getCountryFlag('KR') },
  { code: 'SG', name: 'Singapore', flag: getCountryFlag('SG') },
  { code: 'MY', name: 'Malaysia', flag: getCountryFlag('MY') },
  { code: 'TH', name: 'Thailand', flag: getCountryFlag('TH') },
  { code: 'ID', name: 'Indonesia', flag: getCountryFlag('ID') },
  { code: 'PH', name: 'Philippines', flag: getCountryFlag('PH') },
  { code: 'VN', name: 'Vietnam', flag: getCountryFlag('VN') },
  { code: 'NZ', name: 'New Zealand', flag: getCountryFlag('NZ') },
  { code: 'ZA', name: 'South Africa', flag: getCountryFlag('ZA') },
  { code: 'AE', name: 'United Arab Emirates', flag: getCountryFlag('AE') },
  { code: 'SA', name: 'Saudi Arabia', flag: getCountryFlag('SA') },
  { code: 'IL', name: 'Israel', flag: getCountryFlag('IL') },
  { code: 'TR', name: 'Turkey', flag: getCountryFlag('TR') },
  { code: 'RU', name: 'Russia', flag: getCountryFlag('RU') },
  { code: 'UA', name: 'Ukraine', flag: getCountryFlag('UA') },
  { code: 'EG', name: 'Egypt', flag: getCountryFlag('EG') },
  { code: 'NG', name: 'Nigeria', flag: getCountryFlag('NG') },
  { code: 'KE', name: 'Kenya', flag: getCountryFlag('KE') },
];

export const SEARCH_TYPES = [
  { value: 'general', label: 'General', description: 'Standard keyword research' },
  { value: 'how_to', label: 'How-To', description: 'Step-by-step guides and tutorials' },
  { value: 'listicle', label: 'Listicle', description: 'List-based content (Top 10, Best, etc.)' },
  { value: 'product', label: 'Product', description: 'Product reviews and comparisons' },
  { value: 'brand', label: 'Brand', description: 'Brand-related searches' },
  { value: 'comparison', label: 'Comparison', description: 'Compare products or services' },
  { value: 'qa', label: 'Q&A', description: 'Question and answer content' },
  { value: 'evergreen', label: 'Evergreen', description: 'Timeless content' },
  { value: 'seasonal', label: 'Seasonal', description: 'Time-sensitive content' },
] as const;

export const SEARCH_MODES = [
  { value: 'keywords', label: 'Keywords', icon: '🔍' },
  { value: 'matching_terms', label: 'Matching Terms', icon: '📝' },
  { value: 'related_terms', label: 'Related Terms', icon: '🔗' },
  { value: 'questions', label: 'Questions', icon: '❓' },
  { value: 'ads_ppc', label: 'Ads / PPC', icon: '💰' },
] as const;

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
] as const;

