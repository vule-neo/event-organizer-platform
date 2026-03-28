import { CommonModule } from '@angular/common';
import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { VenueService } from '../app/services/venue.service';
import { WorkingHoursComponent } from '../app/working-hours/working-hours.component';
import { AddressPickerComponent, AddressResult } from '../app/address-picker/address-picker.component';
import { environment } from '../environments/environment';

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
  apiBase = environment.apiBase;

  venueId: string | null = null;
  isEditMode: boolean = false;

  existingImages: any[] = [];
  imagesToDelete: number[] = [];
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  sports: any[] = [];
  isDragging = false;

  // Tagovi
  allTags: any[] = [];
  selectedTagIds: string[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private venueService: VenueService
  ) { }

  ngOnInit() {
    this.venueId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.venueId;

    this.venueForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      sport_id: ['', [Validators.required]],
      country: ['Srbija', [Validators.required, Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      street: ['', [Validators.required, Validators.maxLength(255)]],
      lat: [null, [Validators.required]],
      lng: [null, [Validators.required]],
      price_per_slot: [null, [Validators.required, Validators.min(0.01)]],
      slot_duration_mins: [60, [Validators.required]],
      description: ['', [Validators.maxLength(1000)]]
    });

    this.loadSports();
    this.loadTags();

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

  loadTags() {
    this.venueService.getTags().subscribe({
      next: (data) => this.allTags = data,
      error: () => this.message = 'Greška pri učitavanju tagova.'
    });
  }

  loadVenueData(id: string) {
    this.venueService.getVenueById(id).subscribe({
      next: (data) => {
        this.venueForm.patchValue(data);
        if (data.working_hours) this.savedWorkingHours = data.working_hours;
        if (data.images) this.existingImages = data.images;
        // Učitaj postojeće tagove
        if (data.tags) this.selectedTagIds = data.tags.map((t: any) => t.id);
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

  toggleTag(tagId: string) {
    const index = this.selectedTagIds.indexOf(tagId);
    if (index === -1) {
      this.selectedTagIds.push(tagId);
    } else {
      this.selectedTagIds.splice(index, 1);
    }
  }

  isTagSelected(tagId: string): boolean {
    return this.selectedTagIds.includes(tagId);
  }

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
    } else if (this.step === 3) {
      this.step = 4;
    }
  }

  prevStep() {
    this.step--;
    this.message = '';
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    this.handleFiles(files);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  private handleFiles(files: FileList) {
    const totalAllowed = 5;
    const currentTotal = this.existingImages.length + this.selectedFiles.length;
    let availableSlots = totalAllowed - currentTotal;

    if (availableSlots <= 0) {
      this.message = 'Maksimalan broj slika je 5.';
      return;
    }

    Array.from(files).forEach(file => {
      if (availableSlots <= 0) return;

      // Validate that it's an image
      if (file.type.match(/image\/*/)) {
        this.selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e: any) => this.previewUrls.push(e.target.result);
        reader.readAsDataURL(file);
        availableSlots--;
      }
    });

    if (Array.from(files).length > availableSlots && availableSlots === 0) {
       this.message = 'Neke slike nisu dodate jer je dostignut limit od 5 slika.';
    }
  }

  removeImage(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  removeExistingImage(imageId: number, index: number) {
    this.imagesToDelete.push(imageId);
    this.existingImages.splice(index, 1);
  }

  // ZAMIJENI createVenue() metodu u venue-form.component.ts

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
      const val = formValues[key];
      // Šalji i null vrijednosti kao prazan string — backend treba sva polja
      // Za lat/lng šalji kao broj ili preskoči ako null (backend će zadržati staru vrijednost)
      if (val !== null && val !== undefined && val !== '') {
        formData.append(key, val);
      }
    });

    // Ako je edit mode i lat/lng nisu promenjeni (null u formi),
    // ne šalji ih — backend će zadržati stare vrijednosti
    // ALI moramo osigurati da UPDATE ne pokuša SET lat=undefined
    formData.append('working_hours', JSON.stringify(this.savedWorkingHours));
    formData.append('tags', JSON.stringify(this.selectedTagIds));
    this.selectedFiles.forEach(file => formData.append('images', file));
    formData.append('owner_id', ownerId);
    formData.append('currency', 'RSD');

    if (this.isEditMode) {
      formData.append('imagesToDelete', JSON.stringify(this.imagesToDelete));
      this.venueService.updateVenue(this.venueId!, formData).subscribe({
        next: () => this.router.navigate(['/tereni/moji']),
        error: (err) => this.message = 'Greška pri ažuriranju: ' + (err?.error?.message || 'Pokušaj ponovo.')
      });
    } else {
      this.venueService.createVenue(formData).subscribe({
        next: () => this.router.navigate(['/tereni/moji']),
        error: (err) => this.message = 'Greška pri kreiranju: ' + (err?.error?.message || 'Pokušaj ponovo.')
      });
    }
  }
}