import { Component, OnInit, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import * as L from 'leaflet';

interface Location {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  opening_hours: string;
  is_pharmacy: boolean;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col relative">
      <div id="map" class="flex-1 w-full z-0"></div>

      @if (loading()) {
        <div class="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      }

      <div class="absolute top-4 right-4 z-[1000] bg-white p-2 rounded shadow-md text-xs">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full bg-blue-600"></span>
          <span>Apotheken</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-600"></span>
          <span>MeTIMat Automaten</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
      #map {
        height: 100%;
      }
    `,
  ],
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private locations = signal<Location[]>([]);
  loading = signal(true);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.fetchLocations();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    // Default center (Berlin)
    this.map = L.map('map', {
      center: [52.52, 13.405],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Fix for Leaflet default marker icons not showing in Angular/Webpack
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  private fetchLocations(): void {
    // AuthInterceptor handles token headers automatically
    this.http.get<Location[]>('/api/v1/locations/').subscribe({
      next: (data) => {
        this.locations.set(data);
        this.addMarkersToMap();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private addMarkersToMap(): void {
    if (!this.map) return;

    this.locations().forEach((loc) => {
      const markerColor = loc.is_pharmacy ? 'blue' : 'red';

      // Creating a simple colored dot marker since we don't have colored SVG icons easily available
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7, 7],
      });

      L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(this.map).bindPopup(`
          <div class="font-sans">
            <h3 class="font-bold text-sm mb-1">${loc.name}</h3>
            <p class="text-xs text-gray-600 mb-1">${loc.address}</p>
            <p class="text-xs text-blue-800"><b>Hours:</b> ${loc.opening_hours}</p>
            ${(loc as any).is_available === false ? '<p class="text-xs text-red-600 font-bold mt-1">Nicht alle Artikel verfügbar</p>' : ''}
          </div>
        `);
    });

    if (this.locations().length > 0) {
      const group = L.featureGroup(
        this.locations().map((l) => L.marker([l.latitude, l.longitude])),
      );
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }
}
