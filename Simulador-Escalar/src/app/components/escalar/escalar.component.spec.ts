import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscalarComponent } from './escalar.component';

describe('EscalarComponent', () => {
  let component: EscalarComponent;
  let fixture: ComponentFixture<EscalarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EscalarComponent]
    });
    fixture = TestBed.createComponent(EscalarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
