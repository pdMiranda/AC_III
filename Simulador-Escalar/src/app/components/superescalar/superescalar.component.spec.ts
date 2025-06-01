import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperescalarComponent } from './superescalar.component';

describe('SuperescalarComponent', () => {
  let component: SuperescalarComponent;
  let fixture: ComponentFixture<SuperescalarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SuperescalarComponent]
    });
    fixture = TestBed.createComponent(SuperescalarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
