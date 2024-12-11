import { Component } from '@angular/core';
import {MatSidenavModule} from '@angular/material/sidenav';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss']
})
export class IndexComponent {
  arquitetura: string = '';
  tipo: string = '';

  onArquiteturaChange(event: { arquitetura: string, tipo: string }) {
    this.arquitetura = event.arquitetura;
    this.tipo = event.tipo;
    console.log(event);
  }
}
