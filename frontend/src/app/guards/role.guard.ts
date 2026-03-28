import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Uzimamo usera iz localStorage (isto kao što radiš u formi)
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const token = localStorage.getItem('token') || '{}';

  // Proveravamo koje su uloge dozvoljene za ovu rutu
  // To ćemo definisati u routes fajlu pod 'data'
  const expectedRoles = route.data['expectedRoles'] as string[];


  if (user && token && expectedRoles.includes(user.role)) {
    return true;
  }

  // Ako nije ulogovan ili nema ulogu, šalji ga na login ili home
  alert('Nemate dozvolu za pristup ovoj stranici.');
  router.navigate(['/prijava']);
  return false;
};