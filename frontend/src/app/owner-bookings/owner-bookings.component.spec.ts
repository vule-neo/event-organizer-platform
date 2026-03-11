import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerBookingsComponent } from './owner-bookings.component';

describe('OwnerBookingsComponent', () => {
  let component: OwnerBookingsComponent;
  let fixture: ComponentFixture<OwnerBookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerBookingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OwnerBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
