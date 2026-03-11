import { CommonModule } from '@angular/common';
import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { VenueService } from '../app/services/venue.service';
import { WorkingHoursComponent } from '../app/working-hours/working-hours.component';
import { AddressPickerComponent, AddressResult } from '../app/address-picker/address-picker.component';

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, WorkingHoursComponent, AddressPickerComponent],
  templateUrl: './venue-form.component.html',
  styleUrl: './venue-form.component.css'
})
export class VenueFormComponent implements OnInit {
  @ViewChild('workingHoursComp') workingHoursComp!: WorkingHoursComponent;

  venueForm!: FormGroup;
  message = '';
  step: number = 1;
  
  venueId: string | null = null;
  isEditMode: boolean = false;
  
  existingImages: any[] = []; 
  imagesToDelete: number[] = [];
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  sports: any[] = []; // Za dropdown sportova iz baze

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private venueService: VenueService
  ) {}

  ngOnInit() {
    this.venueId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.venueId;

    this.venueForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      sport_id: ['', [Validators.required]], // Dodato zbog baze
      country: ['Srbija', [Validators.required, Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      street: ['', [Validators.required, Validators.maxLength(255)]],
      lat: [null, [Validators.required]], // Dodato za mapu
      lng: [null, [Validators.required]], // Dodato za mapu
      price_per_slot: [null, [Validators.required, Validators.min(0.01)]],
      slot_duration_mins: [60, [Validators.required]],
      description: ['', [Validators.maxLength(1000)]]
    });

    this.loadSports();

    if (this.isEditMode && this.venueId) {
      this.loadVenueData(this.venueId);
    }
  }

  loadSports() {
    this.venueService.getSports().subscribe({
      next: (data) => this.sports = data,
      error: () => this.message = 'Greška pri učitavanju sportova.'
    });
  }

  loadVenueData(id: string) {
    this.venueService.getVenueById(id).subscribe({
      next: (data) => {
        this.venueForm.patchValue(data);
        if (data.working_hours) this.savedWorkingHours = data.working_hours;
        if (data.images) this.existingImages = data.images;
      },
      error: () => this.message = 'Greška pri učitavanju podataka.'
    });
  }

  onAddressChange(event: AddressResult) {
    this.venueForm.patchValue({
      city: event.city,
      street: event.street,
      country: event.country,
      lat: event.lat,
      lng: event.lng
    });
  }

  // --- STEP LOGIKA ---
  savedWorkingHours: any[] = [];

  nextStep() {

    if (this.step === 1) {
      if (this.venueForm.valid) {
        this.step = 2;
        setTimeout(() => {
          if (this.workingHoursComp && this.savedWorkingHours.length > 0) {
            this.workingHoursComp.setWorkingHoursData(this.savedWorkingHours);
          }
        }, 100);
      } else {
        this.venueForm.markAllAsTouched();
      }
    } else if (this.step === 2) {
      if (this.workingHoursComp) {
        this.savedWorkingHours = this.workingHoursComp.getWorkingHoursData();
        this.step = 3;
      }
    }
  }

  prevStep() {
    this.step--;
    this.message = '';
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    Array.from(files).forEach(file => {
      this.selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e: any) => this.previewUrls.push(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  removeExistingImage(imageId: number, index: number) {
    this.imagesToDelete.push(imageId);
    this.existingImages.splice(index, 1);
  }

  createVenue() {
    if (this.venueForm.invalid) {
      this.message = 'Podaci o terenu nisu ispravni ili niste odabrali lokaciju.';
      this.step = 1;
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const ownerId = currentUser.id;
    if (!ownerId) { this.message = 'Vlasnik nije identifikovan.'; return; }

    const formData = new FormData();
    const formValues = this.venueForm.value;
    Object.keys(formValues).forEach(key => {
      if (formValues[key] !== null && formValues[key] !== undefined) {
        formData.append(key, formValues[key]);
      }
    });

    formData.append('working_hours', JSON.stringify(this.savedWorkingHours));
    this.selectedFiles.forEach(file => formData.append('images', file));
    formData.append('owner_id', ownerId);
    formData.append('currency', 'RSD');

    if (this.isEditMode) {
      formData.append('imagesToDelete', JSON.stringify(this.imagesToDelete));
      this.venueService.updateVenue(this.venueId!, formData).subscribe({
        next: () => this.router.navigate(['/venues/ownerVenues']),
        error: () => this.message = 'Greška pri ažuriranju.'
      });
    } else {
      this.venueService.createVenue(formData).subscribe({
        next: () => this.router.navigate(['/venues/ownerVenues']),
        error: () => this.message = 'Greška pri kreiranju.'
      });
    }
  }
}