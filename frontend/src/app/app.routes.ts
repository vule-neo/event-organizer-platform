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
import { ProfileComponent } from './profile/profile.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminVenuesComponent } from './admin-venues/admin-venues.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { FaqComponent } from './faq/faq.component';
import { HelpmeComponent } from './helpme/helpme.component';
import { ContactComponent } from './contact/contact.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { TermsOfUseComponent } from './terms-of-use/terms-of-use.component';

export const routes: Routes = [
  { path: '', redirectTo: '/istrazi', pathMatch: 'full' },
  { path: 'prijava', component: LoginComponent },
  { path: 'registracija', component: UserRegisterComponent },
  { path: 'zaboravljena-lozinka', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'istrazi', component: VenueListComponent },
  { path: 'tereni/detalji/:id', component: VenueDetailComponent },

  // Legal pages
  { path: 'politika-privatnosti', component: PrivacyPolicyComponent },
  { path: 'uslovi-koriscenja', component: TermsOfUseComponent },

  { path: 'profil', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'moje-rezervacije', component: MyBookingsComponent, canActivate: [authGuard] },

  { path: 'tereni/novi', component: VenueFormComponent, canActivate: [authGuard, roleGuard], data: { expectedRoles: ['owner'] } },
  { path: 'tereni/izmena/:id', component: VenueFormComponent, canActivate: [authGuard, roleGuard], data: { expectedRoles: ['owner'] } },
  { path: 'tereni/moji', component: OwnerVenuesComponent, canActivate: [authGuard, roleGuard], data: { expectedRoles: ['owner'] } },
  { path: 'tereni/izvestaji', component: OwnerBookingsComponent, canActivate: [authGuard, roleGuard], data: { expectedRoles: ['owner'] } },

  { path: 'bookings/:id', component: BookingDetailComponent, canActivate: [authGuard] },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['admin'] },
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'korisnici', component: AdminUsersComponent },
      { path: 'tereni', component: AdminVenuesComponent }
    ]
  },
  { path: 'faq', component: FaqComponent },
  { path: 'pomoc', component: HelpmeComponent },
  { path: 'kontakt', component: ContactComponent },
];