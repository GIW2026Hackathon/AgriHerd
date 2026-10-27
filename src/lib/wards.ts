import type { Ward } from './types';

// Ward centroids — approximate WGS-84 centroids (not survey-grade parcel boundaries).
// Coverage: all 45 Kisii County wards and all 20 Nyamira County wards (Gusii highlands).
const K = (name: string, sub_county: string, lat: number, lng: number, elevation_m: number): Ward =>
  ({ name, county: 'Kisii', sub_county, lat, lng, elevation_m });
const N = (name: string, sub_county: string, lat: number, lng: number, elevation_m: number): Ward =>
  ({ name, county: 'Nyamira', sub_county, lat, lng, elevation_m });

export const WARDS: Ward[] = [
  // Kitutu Chache North
  K('Sironga', 'Kitutu Chache North', -0.6671, 34.7423, 1640), K('Suneka/Bosaaro', 'Kitutu Chache North', -0.7014, 34.7536, 1620),
  K('Nyatieko', 'Kitutu Chache North', -0.6543, 34.7706, 1715), K('Marani', 'Kitutu Chache North', -0.6199, 34.8009, 1580), K('Matara', 'Kitutu Chache North', -0.6908, 34.7390, 1665),
  // Kitutu Chache South
  K('Kiogoro/Riomaguka', 'Kitutu Chache South', -0.7324, 34.7612, 1690), K('Nyamasocho', 'Kitutu Chache South', -0.7571, 34.7358, 1755),
  K('Nyweri', 'Kitutu Chache South', -0.7356, 34.7245, 1800), K('Moturere/Nyakoe', 'Kitutu Chache South', -0.6921, 34.7561, 1635), K('Buyuni', 'Kitutu Chache South', -0.7488, 34.7122, 1835),
  // Nyaribari Masaba
  K('Rigiro', 'Nyaribari Masaba', -0.8404, 34.7372, 1810), K('Masige East', 'Nyaribari Masaba', -0.8045, 34.7711, 1720),
  K('Sang', 'Nyaribari Masaba', -0.8567, 34.7567, 1885), K('Ogembo', 'Nyaribari Masaba', -0.8198, 34.8021, 1650), K('Manga West', 'Nyaribari Masaba', -0.8683, 34.7998, 1740),
  // Nyaribari Chache
  K('Gewancha', 'Nyaribari Chache', -0.7245, 34.7934, 1590), K('Masige West', 'Nyaribari Chache', -0.7421, 34.8102, 1565),
  K('Bogetenga', 'Nyaribari Chache', -0.6987, 34.8012, 1610), K('Bobaracho', 'Nyaribari Chache', -0.6701, 34.7834, 1680), K('Nyacheki', 'Nyaribari Chache', -0.7512, 34.7763, 1675),
  // Bobasi
  K('Itibo', 'Bobasi', -0.7612, 34.8957, 1540), K('B/chache', 'Bobasi', -0.7012, 34.8345, 1585),
  K('Bobasi Chache', 'Bobasi', -0.7901, 34.8541, 1600), K('Nyachebe/Nyakoe', 'Bobasi', -0.7345, 34.8367, 1570),
  // Bomachoge Borabu
  K('Bomwagamo', 'Bomachoge Borabu', -0.5789, 34.6234, 1460), K('Boochi/Tendere', 'Bomachoge Borabu', -0.5534, 34.6712, 1520),
  K('Nyatieko East', 'Bomachoge Borabu', -0.5234, 34.6445, 1490), K('Bobaracho North', 'Bomachoge Borabu', -0.5912, 34.6789, 1555), K('Bogirango Oboro', 'Bomachoge Borabu', -0.5401, 34.7012, 1505),
  // South Mugirango
  K('Gesima', 'South Mugirango', -0.9123, 34.8212, 1700), K('Nyagoe', 'South Mugirango', -0.8789, 34.8456, 1780),
  K('Mosobeti', 'South Mugirango', -0.9345, 34.7789, 1845), K('Nyakoe South', 'South Mugirango', -0.8934, 34.7321, 1900), K('Rigoma', 'South Mugirango', -0.9567, 34.8345, 1735),
  // North Mugirango
  K('Boochi West', 'North Mugirango', -0.6001, 34.7234, 1730), K('Boochi Central', 'North Mugirango', -0.5789, 34.7456, 1690),
  K('Mogusii', 'North Mugirango', -0.6112, 34.7012, 1765), K('Getenga', 'North Mugirango', -0.6312, 34.7345, 1665), K('Kegonga', 'North Mugirango', -0.5512, 34.7345, 1630),
  // Manga
  K('Masera', 'Manga', -0.8123, 34.7123, 1750), K('Rangulu', 'Manga', -0.8456, 34.6898, 1820),
  K('Nyansiongo', 'Manga', -0.7878, 34.6812, 1680), K('Manga', 'Manga', -0.8234, 34.6541, 1790), K('Bogusero', 'Manga', -0.7701, 34.6934, 1715),
  // Nyamira — Kitutu Masaba North
  N('Bomwagamo North', 'Kitutu Masaba North', -0.4923, 34.8312, 1580), N('Rigoma North', 'Kitutu Masaba North', -0.4678, 34.8567, 1545),
  N('Nyamache', 'Kitutu Masaba North', -0.4856, 34.7934, 1665), N('Boronso', 'Kitutu Masaba North', -0.4423, 34.8134, 1510),
  // Nyamira — Kitutu Masaba East
  N('Kiabonyoru', 'Kitutu Masaba East', -0.4701, 34.9012, 1470), N('Gekeru', 'Kitutu Masaba East', -0.4456, 34.8789, 1505),
  N('Kebirigo', 'Kitutu Masaba East', -0.4123, 34.8456, 1450), N('Riabigicha', 'Kitutu Masaba East', -0.4234, 34.9012, 1425),
  // Nyamira — Kitutu Masaba West
  N('Ekerenyo', 'Kitutu Masaba West', -0.5012, 34.7345, 1615), N('Rigoma West', 'Kitutu Masaba West', -0.4789, 34.7012, 1685),
  N('Kiabonyoru West', 'Kitutu Masaba West', -0.4456, 34.7567, 1590), N('Boronda', 'Kitutu Masaba West', -0.4289, 34.7123, 1640),
  // Nyamira — Kitutu Masaba South
  N('Bomwagamo South', 'Kitutu Masaba South', -0.5312, 34.8123, 1600), N('Rioma', 'Kitutu Masaba South', -0.5534, 34.7789, 1705),
  N('Kegonga West', 'Kitutu Masaba South', -0.5234, 34.7567, 1625),
  // Nyamira — Borabu
  N('Kiabonyoru Borabu', 'Borabu', -0.3923, 34.9012, 1395), N('Kiabonyoru Central', 'Borabu', -0.3612, 34.8567, 1380),
  N('Kegonga East', 'Borabu', -0.3834, 34.7234, 1465), N('Kiansongo', 'Borabu', -0.3401, 34.8012, 1355), N('Kianjokoma', 'Borabu', -0.3567, 34.6712, 1415),
];

export const wardByName = (name: string) => WARDS.find((w) => w.name === name);
export const countyOf = (name: string): 'Kisii' | 'Nyamira' => wardByName(name)?.county ?? 'Kisii';
