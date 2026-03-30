import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';

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

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.adminService.getAllVenues().subscribe({
      next: (data) => { this.venues = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  toggleVenue(venue: any) {
    const akcija = venue.is_active ? 'deaktivirate' : 'aktivirate';
    if (confirm(`Da li želite da ${akcija} teren "${venue.name}"?`)) {
      this.adminService.toggleVenueActive(venue.id).subscribe({
        next: (res) => venue.is_active = res.is_active,
        error: () => alert('Greška.')
      });
    }
  }

  deleteVenue(venue: any) {
    if (confirm(`BRISANJE: Da li ste sigurni da želite trajno obrisati "${venue.name}"? Ova akcija je nepovratna.`)) {
      this.adminService.deleteVenue(venue.id).subscribe({
        next: () => this.venues = this.venues.filter(v => v.id !== venue.id),
        error: () => alert('Greška pri brisanju.')
      });
    }
  }
}