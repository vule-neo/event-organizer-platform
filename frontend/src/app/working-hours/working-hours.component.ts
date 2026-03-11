import { Component, Input } from '@angular/core';
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
  // Lista dana (0 = Nedelja, po tvojoj bazi)
  workingHours: WorkingDay[] = [
    { day_of_week: 1, day_name: 'Ponedeljak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 2, day_name: 'Utorak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 3, day_name: 'Sreda', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 4, day_name: 'Četvrtak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 5, day_name: 'Petak', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day_of_week: 6, day_name: 'Subota', is_open: true, open_time: '09:00', close_time: '23:00' },
    { day_of_week: 0, day_name: 'Nedelja', is_open: false, open_time: null, close_time: null },
  ];

  // Metoda koju ćeš pozvati iz roditeljske komponente da pokupiš podatke
  getWorkingHoursData() {
    return this.workingHours.map(day => ({
      day_of_week: day.day_of_week,
      is_open: day.is_open,
      open_time: day.is_open ? day.open_time : null,
      close_time: day.is_open ? day.close_time : null
    }));
  }

  // ... unutar WorkingHoursComponent klase ...

  setWorkingHoursData(data: any[]) {
    if (!data || data.length === 0) return;

    // Prolazimo kroz sate koje smo dobili iz baze
    data.forEach(dbDay => {
      // Nalazimo odgovarajući dan u našem lokalnom nizu
      const localDay = this.workingHours.find(d => d.day_of_week === dbDay.day_of_week);
      
      if (localDay) {
        localDay.is_open = dbDay.is_open;
        // PostgreSQL nekad vraća '08:00:00', pa sečemo na '08:00' da bi HTML input prepoznao
        localDay.open_time = dbDay.open_time ? dbDay.open_time.substring(0, 5) : null;
        localDay.close_time = dbDay.close_time ? dbDay.close_time.substring(0, 5) : null;
      }
    });
  }

}