import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-register.component.html',
  styleUrl: './user-register.component.css'
})
export class UserRegisterComponent {
  registerForm: FormGroup;
  message = '';
  isError = false;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name:  ['', Validators.required],
      email:      ['', [Validators.required, Validators.email]],
      phone:      [''],
      password:   ['', [Validators.required, Validators.minLength(6)]],
      role:       ['customer', Validators.required]
    });
  }

  register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.message = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: (res: any) => {
        this.isError = false;
        this.message = 'Nalog uspješno kreiran! Preusmjeravamo vas...';
        this.loading = false;
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setTimeout(() => this.router.navigate(['']), 1500);
      },
      error: (err) => {
        this.isError = true;
        this.message = err.error?.message || 'Greška pri registraciji.';
        this.loading = false;
      }
    });
  }
}
