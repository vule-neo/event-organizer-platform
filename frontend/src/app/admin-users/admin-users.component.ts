import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../services/notification.service';

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

  constructor(private adminService: AdminService, private notif: NotificationService) { }

  ngOnInit() {
    this.adminService.getAllUsers().subscribe({
      next: (data) => { this.users = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  async toggleUser(user: any) {
    const akcija = user.is_active ? 'deaktivirate' : 'aktivirate';
    const ok = await this.notif.confirm(`Da li želite da ${akcija} korisnika "${user.email}"?`);
    if (!ok) return;
    this.adminService.toggleUserActive(user.id).subscribe({
      next: (res) => { user.is_active = res.is_active; this.notif.success('Status korisnika je promenjen.'); },
      error: () => this.notif.error('Greška pri promeni statusa.')
    });
  }
}