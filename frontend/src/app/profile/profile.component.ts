import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

const namePattern = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄČĆĘÈÉÊËĖĮÌÍÎÏŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css' // Dodaj ako imaš CSS fajl
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  loading = false;
  message = '';
  isError = false; // <--- OVO JE FALILO

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.pattern(namePattern)]],
      last_name: ['', [Validators.required, Validators.pattern(namePattern)]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9+ ]*$')]],
      email: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    // 1. Prvo popuni iz localStorage-a (da se odmah vidi nešto)
    const localUser = this.authService.getUser();
    if (localUser && localUser.email) {
      this.profileForm.patchValue(localUser);
    }

    // 2. Onda osveži najsvežijim podacima sa servera
    this.authService.getProfileFromServer().subscribe({
      next: (freshUser) => {
        this.profileForm.patchValue(freshUser);
      },
      error: (err) => {
        console.error('Neuspešno osvežavanje sa servera', err);
      }
    });
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    this.loading = true;
    this.message = '';
    this.isError = false;

    this.authService.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: (res) => {
        this.message = 'Profil je uspešno ažuriran!';
        this.isError = false;
        this.loading = false;
      },
      error: (err) => {
        this.message = 'Došlo je do greške pri čuvanju podataka.';
        this.isError = true;
        this.loading = false;
        console.error(err);
      }
    });
  }
}