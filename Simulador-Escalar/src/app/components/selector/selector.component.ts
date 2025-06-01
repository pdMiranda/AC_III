import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-selector',
  templateUrl: './selector.component.html',
  styleUrls: ['./selector.component.scss']
})
export class SelectorComponent {
  @Output() arquiteturaChange = new EventEmitter<{ arquitetura: string, tipo: string }>();

  selecionaArquitetura = ['Escalar', 'Superescalar'];
  tipoMultithreading: { [key: string]: string[] } = {
    'Escalar': ['Base', 'IMT', 'BMT'],
    'Superescalar': ['Base', 'IMT', 'BMT', 'SMT']
  };

  arquitetura: string = '';
  tipo: string = '';
  opcaoSelecionada: string[] = [];

  onSelectArquitetura(opcao: string) {
    this.arquitetura = opcao;
    this.opcaoSelecionada = this.tipoMultithreading[opcao] || [];
    this.tipo = '';
    this.emitChange();
  }

  onSelectTipo(opcao: string) {
    this.tipo = opcao;
    this.emitChange();
  }

  emitChange(){
    this.arquiteturaChange.emit({ arquitetura: this.arquitetura, tipo: this.tipo });
  }
}
