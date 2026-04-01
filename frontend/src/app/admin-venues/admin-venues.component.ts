import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-admin-venues',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-venues.component.html',
  styleUrls: ['./admin-venues.component.css']
})
export class AdminVenuesComponent implements OnInit {
  venues: any[] = [];
  loading = true;
  apiBase = environment.apiBase;

  constructor(private adminService: AdminService, private notif: NotificationService) { }

  ngOnInit() {
    this.adminService.getAllVenues().subscribe({
      next: (data) => { this.venues = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  async toggleVenue(venue: any) {
    const akcija = venue.is_active ? 'deaktivirate' : 'aktivirate';
    const ok = await this.notif.confirm(`Da li želite da ${akcija} teren "${venue.name}"?`);
    if (!ok) return;
    this.adminService.toggleVenueActive(venue.id).subscribe({
      next: (res) => { venue.is_active = res.is_active; this.notif.success('Status terena je promenjen.'); },
      error: () => this.notif.error('Greška.')
    });
  }

  async deleteVenue(venue: any) {
    const ok = await this.notif.confirm(`BRISANJE: Da li ste sigurni da želite trajno obrisati "${venue.name}"? Ova akcija je nepovratna.`);
    if (!ok) return;
    this.adminService.deleteVenue(venue.id).subscribe({
      next: () => { this.venues = this.venues.filter(v => v.id !== venue.id); this.notif.success('Teren je obrisan.'); },
      error: () => this.notif.error('Greška pri brisanju.')
    });
  }
}