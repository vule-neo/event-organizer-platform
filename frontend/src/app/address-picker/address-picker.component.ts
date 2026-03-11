import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Output,
         ElementRef, ViewChild, AfterViewInit, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AddressResult {
  formatted: string;
  street: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

declare var google: any;

@Component({
  selector: 'app-address-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './address-picker.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AddressPickerComponent implements AfterViewInit {
  @Output() addressSelected = new EventEmitter<AddressResult>();
  @ViewChild('addressInput') addressInput!: ElementRef;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    const autocomplete = new google.maps.places.Autocomplete(
      this.addressInput.nativeElement,
      {
        componentRestrictions: { country: ['rs', 'ba', 'me', 'hr'] },
        fields: ['formatted_address', 'address_components', 'geometry']
      }
    );

    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = autocomplete.getPlace();
        console.log('Place:', place);

        if (!place.geometry) {
          console.warn('Nema geometry za odabranu adresu');
          return;
        }

        const result: AddressResult = {
          formatted: place.formatted_address || '',
          street: this.getStreet(place),
          city: this.getCity(place),
          country: this.getCountry(place),
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        console.log('Emitujem:', result);
        this.addressSelected.emit(result);
      });
    });
  }

  private getStreet(place: any): string {
    const components = place.address_components;
    if (!components) return '';
    const route = components.find((c: any) => c.types.includes('route'))?.long_name || '';
    const number = components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
    return number ? `${route} ${number}`.trim() : route.trim();
  }

  private getCity(place: any): string {
    const components = place.address_components;
    if (!components) return '';
    return components.find((c: any) =>
      c.types.includes('locality') ||
      c.types.includes('postal_town') ||
      c.types.includes('administrative_area_level_2')
    )?.long_name || '';
  }

  private getCountry(place: any): string {
    const components = place.address_components;
    if (!components) return '';
    return components.find((c: any) => c.types.includes('country'))?.long_name || '';
  }
}