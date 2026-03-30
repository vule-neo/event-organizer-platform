import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  users: any[] = [];
  loading = true;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.adminService.getAllUsers().subscribe({
      next: (data) => { this.users = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  toggleUser(user: any) {
    const akcija = user.is_active ? 'deaktivirate' : 'aktivirate';
    if (confirm(`Da li želite da ${akcija} korisnika "${user.email}"?`)) {
      this.adminService.toggleUserActive(user.id).subscribe({
        next: (res) => user.is_active = res.is_active,
        error: () => alert('Greška.')
      });
    }
  }
}