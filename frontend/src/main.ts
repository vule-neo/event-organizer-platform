import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
script.onload = () => {
  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
};
document.head.appendChild(script);