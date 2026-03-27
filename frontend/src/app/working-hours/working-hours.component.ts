import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface WorkingDay {
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  open_hour?: string;
  open_minute?: string;
  close_hour?: string;
  close_minute?: string;
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
    { day_of_week: 1, day_name: 'Ponedeljak', is_open: true, open_time: '08:00', close_time: '22:00', open_hour: '08', open_minute: '00', close_hour: '22', close_minute: '00' },
    { day_of_week: 2, day_name: 'Utorak', is_open: true, open_time: '08:00', close_time: '22:00', open_hour: '08', open_minute: '00', close_hour: '22', close_minute: '00' },
    { day_of_week: 3, day_name: 'Sreda', is_open: true, open_time: '08:00', close_time: '22:00', open_hour: '08', open_minute: '00', close_hour: '22', close_minute: '00' },
    { day_of_week: 4, day_name: 'Četvrtak', is_open: true, open_time: '08:00', close_time: '22:00', open_hour: '08', open_minute: '00', close_hour: '22', close_minute: '00' },
    { day_of_week: 5, day_name: 'Petak', is_open: true, open_time: '08:00', close_time: '22:00', open_hour: '08', open_minute: '00', close_hour: '22', close_minute: '00' },
    { day_of_week: 6, day_name: 'Subota', is_open: true, open_time: '09:00', close_time: '23:00', open_hour: '09', open_minute: '00', close_hour: '23', close_minute: '00' },
    { day_of_week: 0, day_name: 'Nedelja', is_open: false, open_time: null, close_time: null },
  ];

  hours: string[] = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  minutes: string[] = ['00', '15', '30', '45'];

  /** Toggle dan otvoren/zatvoren */
  toggleDay(day: WorkingDay): void {
    day.is_open = !day.is_open;
    if (day.is_open && !day.open_time) {
      day.open_time = '08:00';
      day.open_hour = '08';
      day.open_minute = '00';
    }
    if (day.is_open && !day.close_time) {
      day.close_time = '22:00';
      day.close_hour = '22';
      day.close_minute = '00';
    }
  }

  updateTimeFromSelect(day: WorkingDay) {
    if (day.open_hour && day.open_minute) {
      day.open_time = `${day.open_hour}:${day.open_minute}`;
    }
    if (day.close_hour && day.close_minute) {
      day.close_time = `${day.close_hour}:${day.close_minute}`;
    }
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
        if (dbDay.open_time) {
          const t = dbDay.open_time.substring(0, 5);
          local.open_time = t;
          [local.open_hour, local.open_minute] = t.split(':');
        } else {
          local.open_time = null;
        }
        if (dbDay.close_time) {
          const t = dbDay.close_time.substring(0, 5);
          local.close_time = t;
          [local.close_hour, local.close_minute] = t.split(':');
        } else {
          local.close_time = null;
        }
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