import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmState {
  message: string;
  resolve: (result: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private counter = 0;
  toasts$ = new BehaviorSubject<Toast[]>([]);
  confirmState$ = new BehaviorSubject<ConfirmState | null>(null);

  success(message: string, duration = 3500) { this.add(message, 'success', duration); }
  error(message: string, duration = 4500) { this.add(message, 'error', duration); }
  info(message: string, duration = 3500) { this.add(message, 'info', duration); }

  private add(message: string, type: 'success' | 'error' | 'info', duration: number) {
    const id = ++this.counter;
    this.toasts$.next([...this.toasts$.value, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number) {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }

  confirm(message: string): Promise<boolean> {
    return new Promise(resolve => {
      this.confirmState$.next({ message, resolve });
    });
  }

  resolveConfirm(result: boolean) {
    const state = this.confirmState$.value;
    if (state) {
      this.confirmState$.next(null);
      state.resolve(result);
    }
  }
}
