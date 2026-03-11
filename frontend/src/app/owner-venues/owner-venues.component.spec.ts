import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerVenuesComponent } from './owner-venues.component';

describe('OwnerVenuesComponent', () => {
  let component: OwnerVenuesComponent;
  let fixture: ComponentFixture<OwnerVenuesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerVenuesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OwnerVenuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
