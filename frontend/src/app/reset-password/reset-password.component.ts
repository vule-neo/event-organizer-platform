import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirm = '';
  loading = false;
  done = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    if (this.password.length < 6) { this.error = 'Lozinka mora imati minimum 6 karaktera.'; return; }
    if (this.password !== this.confirm) { this.error = 'Lozinke se ne poklapaju.'; return; }
    this.loading = true;
    this.error = '';
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => { this.done = true; this.loading = false; },
      error: (err) => { this.error = err.error?.message || 'Token je istekao.'; this.loading = false; }
    });
  }
}