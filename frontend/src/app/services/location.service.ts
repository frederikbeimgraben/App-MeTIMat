import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Interface for geographical coordinates.
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  constructor() {}

  /**
   * Gets the user's current geographical location using the browser's Geolocation API.
   * @returns An Observable that emits the user's coordinates, or null if access is denied or the API is unavailable.
   */
  getUserLocation(): Observable<GeoCoordinates | null> {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return of(null);
    }

    return new Observable((observer) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          observer.complete();
        },
        (error) => {
          console.error('Error getting user location:', error.message);
          observer.next(null);
          observer.complete();
        },
      );
    });
  }

  /**
   * Calculates the great-circle distance between two points on the Earth using the Haversine formula.
   * @param lat1 Latitude of the first point.
   * @param lon1 Longitude of the first point.
   * @param lat2 Latitude of the second point.
   * @param lon2 Longitude of the second point.
   * @returns The distance between the two points in kilometers.
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  /**
   * Converts degrees to radians.
   * @param degrees The value in degrees.
   * @returns The value in radians.
   */
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
