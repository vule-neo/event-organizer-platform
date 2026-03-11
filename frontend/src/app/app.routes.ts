import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { UserRegisterComponent } from './user-register/user-register.component';
import { authGuard } from './guards/auth.guard';
import { VenueFormComponent } from '../venue-form/venue-form.component';
import { OwnerVenuesComponent } from './owner-venues/owner-venues.component';
import { roleGuard } from './guards/role.guard';
import { VenueListComponent } from '../venue-list/venue-list.component';
import { VenueDetailComponent } from './venue-detail/venue-detail.component';
import { MyBookingsComponent } from './my-bookings/my-bookings.component';
import { OwnerBookingsComponent } from './owner-bookings/owner-bookings.component';
import { BookingDetailComponent } from './booking-detail/booking-detail.component';
import { ProfileComponent } from './profile/profile.component'; // <--- DODAT IMPORT

export const routes: Routes = [
  { path: '', redirectTo: '/explore', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'userRegister', component: UserRegisterComponent },
  { path: 'explore', component: VenueListComponent },
  { path: 'venues/details/:id', component: VenueDetailComponent },

  // Zajedničke rute za sve ulogovane korisnike
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'my-bookings', 
    component: MyBookingsComponent, 
    canActivate: [authGuard] 
  },

  // Role protected rute (Vlasnik)
  { 
    path: 'venues/new', 
    component: VenueFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['owner'] } 
  },
  { 
    path: 'venues/edit/:id', 
    component: VenueFormComponent, 
    canActivate: [authGuard, roleGuard], 
    data: { expectedRoles: ['owner'] } 
  },
  { 
    path: 'venues/ownerVenues', 
    component: OwnerVenuesComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['owner'] }
  },
  { 
    path: 'venues/reports', 
    component: OwnerBookingsComponent, 
    canActivate: [authGuard, roleGuard], 
    data: { expectedRoles: ['owner'] } 
  },

  { 
    path: 'bookings/:id', 
    component: BookingDetailComponent, 
    canActivate: [authGuard] 
  }
];