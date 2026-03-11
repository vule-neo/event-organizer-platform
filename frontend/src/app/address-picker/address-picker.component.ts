import { Component, ElementRef, EventEmitter, NgZone, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AddressResult {
  formatted: string;
  street: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-address-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './address-picker.component.html',
  styleUrls: ['./address-picker.component.css']
})
export class AddressPickerComponent implements AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef;
  @Output() addressSelected = new EventEmitter<AddressResult>();

  private autocomplete: google.maps.places.Autocomplete | undefined;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    // Inicijalizacija Google Autocomplete-a
    this.autocomplete = new google.maps.places.Autocomplete(this.addressInput.nativeElement, {
      componentRestrictions: { country: ['rs', 'ba', 'me', 'hr'] }, // Balkan filter
      fields: ['address_components', 'geometry', 'formatted_address']
    });

    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete?.getPlace();

        if (!place || !place.geometry) {
          console.error('Adresa nije pronađena ili nema koordinata.');
          return;
        }

        const result: AddressResult = {
          formatted: place.formatted_address || '',
          street: this.getComponent(place, 'route') + ' ' + this.getComponent(place, 'street_number'),
          city: this.getComponent(place, 'locality') || this.getComponent(place, 'administrative_area_level_2'),
          country: this.getComponent(place, 'country'),
          lat: place.geometry.location!.lat(),
          lng: place.geometry.location!.lng()
        };

        this.addressSelected.emit(result);
      });
    });
  }

  private getComponent(place: google.maps.places.PlaceResult, type: string): string {
    const comp = place.address_components?.find(c => c.types.includes(type));
    return comp ? comp.long_name : '';
  }
}