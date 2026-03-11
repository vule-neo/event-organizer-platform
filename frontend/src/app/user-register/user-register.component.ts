import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; // <--- DODATO
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-user-register',
  templateUrl: './user-register.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, HttpClientModule] // <--- Zamenjen FormsModule sa ReactiveFormsModule
})
export class UserRegisterComponent implements OnInit {
  registerForm!: FormGroup; // <--- Definisanje forme
  message = '';

  constructor(
    private fb: FormBuilder, // <--- Injektovan FormBuilder
    private http: HttpClient, 
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Inicijalizacija forme sa tvojim poljima
    this.registerForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['customer', Validators.required] // Default je 'customer' (Igrač)
    });
  }

  register() {
    if (this.registerForm.invalid) {
      this.message = 'Molimo popunite sva polja ispravno.';
      return;
    }

    // Uzimamo podatke direktno iz forme (payload je identičan tvom starom)
    const payload = this.registerForm.value;

    this.authService.register(payload).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.router.navigate(['']);
      },
      error: (err) => {
        console.error(err);
        this.message = err.error?.error || 'Greška pri registraciji';
      }
    });
  }
}