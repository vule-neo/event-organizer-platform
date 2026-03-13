import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface WorkingDay {
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

@Component({
  selector: 'app-working-hours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './working-hours.component.html',
  styleUrl: './working-hours.component.css'
})
export class WorkingHoursComponent {

  workingHours: WorkingDay[] = [
    { day_of_week: 1, day_name: 'Ponedeljak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 2, day_name: 'Utorak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 3, day_name: 'Sreda', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 4, day_name: 'Četvrtak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 5, day_name: 'Petak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 6, day_name: 'Subota', is_open: true, open_time: '09:00', close_time: '23:00' },
    { day_of_week: 0, day_name: 'Nedelja', is_open: false, open_time: null, close_time: null },
  ];

  /** Toggle dan otvoren/zatvoren */
  toggleDay(day: WorkingDay): void {
    day.is_open = !day.is_open;
    if (day.is_open && !day.open_time) day.open_time = '08:00';
    if (day.is_open && !day.close_time) day.close_time = '22:00';
  }

  /** Vraća podatke roditeljskoj komponenti */
  getWorkingHoursData() {
    return this.workingHours.map(day => ({
      day_of_week: day.day_of_week,
      is_open: day.is_open,
      open_time: day.is_open ? day.open_time : null,
      close_time: day.is_open ? day.close_time : null,
    }));
  }

  /** Puni podatke iz baze (edit mode) */
  setWorkingHoursData(data: any[]): void {
    if (!data || data.length === 0) return;
    data.forEach(dbDay => {
      const local = this.workingHours.find(d => d.day_of_week === dbDay.day_of_week);
      if (local) {
        local.is_open = dbDay.is_open;
        local.open_time = dbDay.open_time ? dbDay.open_time.substring(0, 5) : null;
        local.close_time = dbDay.close_time ? dbDay.close_time.substring(0, 5) : null;
      }
    });
  }

  /** Računa trajanje između open i close time (prikazuje se kao "X h Y min") */
  getDuration(open: string | null, close: string | null): string {
    if (!open || !close) return '';
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    let mins = (ch * 60 + cm) - (oh * 60 + om);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }
}