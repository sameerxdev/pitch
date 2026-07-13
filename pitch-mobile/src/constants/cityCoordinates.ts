import type { PakistanCity } from "@/constants/routes";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

/** Approximate city centers for map initial region */
export const CITY_COORDINATES: Record<PakistanCity, MapCoordinate> = {
  Lahore: { latitude: 31.5204, longitude: 74.3587 },
  Karachi: { latitude: 24.8607, longitude: 67.0011 },
  Islamabad: { latitude: 33.6844, longitude: 73.0479 },
  Rawalpindi: { latitude: 33.5651, longitude: 73.0169 },
};

export const DEFAULT_MAP_COORDINATE = CITY_COORDINATES.Lahore;

export function coordinateForCity(city: string): MapCoordinate {
  if (city in CITY_COORDINATES) {
    return CITY_COORDINATES[city as PakistanCity];
  }
  return DEFAULT_MAP_COORDINATE;
}
