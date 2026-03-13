import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isScrolled = false;
  mobileMenuOpen = false;

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMobile() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  getUserInitial(): string {
    const name = this.authService.getUserName();
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.mobileMenuOpen = false;
    this.router.navigate(['/login']);
  }
}
