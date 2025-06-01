import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { saveAs } from 'file-saver';

export class InstructionResult {
  IPC: number = 0;
  //Bolhas: number = 0;
  CiclosExecucao: number = 0;
  Instrucoes: number = 0;
}
@Component({
  selector: 'app-superescalar',
  templateUrl: './superescalar.component.html',
  styleUrls: ['./superescalar.component.scss'],
})
export class SuperescalarComponent {
  NUM_THREADS = 4;
  THREAD_SIZE = 20;
  BLOCK_SIZE = 2;

  @Input() tipo: string = '';
  constructor(private cdRef: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.cdRef.detectChanges();
  }

  displayedColumns: string[] = ['#', 'ID', 'JANELA', 'EX', 'WB'];
  pipelineHistory: SuperScalarPipeline[] =
    SuperScalarPipeline.getNullArray(100);
  dataSource = new MatTableDataSource<SuperScalarPipeline>(
    this.pipelineHistory
  );
  actualLine = 1;

  displayedColumns2: string[] = ['name', 'result'];
  results = new InstructionResult();
  dataSource2 = new MatTableDataSource<{ name: string; result: number }>(
    this.getResultsArray()
  );

  threads: Thread[] = [];
  buttonText = 'Gerar Thread';
  step = 1;

  backgroundColors: string[] = ['green', 'red', 'orange', 'blue'];
  instructionNames: string[] = [
    'ADD',
    'SUB',
    'AND',
    'OR',
    'XOR',
    'SLL',
    'SRL',
    'SRA',
    'SLT',
    'SLTU', // ULA
    'MUL',
    'MULH',
    'MULHSU',
    'MULHU',
    'DIV',
    'DIVU',
    'REM',
    'REMU', // ULA
    'LB',
    'LH',
    'LW',
    'LBU',
    'LHU',
    'SB',
    'SH',
    'SW', // MEMORIA
    'BEQ',
    'BNE',
    'BLT',
    'BGE',
    'BLTU',
    'BGEU',
    'JAL',
    'JALR', // DESVIO
  ];

  getResultsArray(): { name: string; result: number }[] {
    return Object.keys(this.results).map((key) => ({
      name: key,
      result: (this.results as any)[key],
    }));
  }

  getRandomInstructionName(): string {
    const randomIndex = Math.floor(
      Math.random() * this.instructionNames.length
    );
    return this.instructionNames[randomIndex];
  }

  getRandomRegister(): string {
    return 'R' + Math.floor(Math.random() * 32);
  }

  updateRenameRegister(atualRegisterRenamed: string) {
    const code = atualRegisterRenamed.charCodeAt(0);
    const newCode = code === 122 ? 97 : code + 1;
    return String.fromCharCode(newCode);
  }

  getRandomImmediate(): number {
    return Math.floor(Math.random() * 1000);
  }

  generateInstruction(
    threadName: string,
    backgroundColor: string,
    threadId: number,
    id: string
  ): Instruction {
    const name = this.getRandomInstructionName();
    const rd = this.getRandomRegister();
    const rs1 = this.getRandomRegister();
    const rs2 = this.getRandomRegister();
    const imm = this.getRandomImmediate();

    if (
      [
        'ADD',
        'SUB',
        'AND',
        'OR',
        'XOR',
        'SLL',
        'SRL',
        'SRA',
        'SLT',
        'SLTU',
        'MUL',
        'MULH',
        'MULHSU',
        'MULHU',
        'DIV',
        'DIVU',
        'REM',
        'REMU',
      ].includes(name)
    ) {
      return new Instruction(
        threadName,
        threadId,
        backgroundColor,
        'R',
        name,
        rd,
        rs1,
        rs2,
        0,
        id
      );
    } else if (['LB', 'LH', 'LW', 'LBU', 'LHU'].includes(name)) {
      return new Instruction(
        threadName,
        threadId,
        backgroundColor,
        'I',
        name,
        rd,
        rs1,
        '',
        imm,
        id
      );
    } else if (['SB', 'SH', 'SW'].includes(name)) {
      return new Instruction(
        threadName,
        threadId,
        backgroundColor,
        'S',
        name,
        '',
        rs1,
        rs2,
        imm,
        id
      );
    } else if (['BEQ', 'BNE', 'BLT', 'BGE', 'BLTU', 'BGEU'].includes(name)) {
      return new Instruction(
        threadName,
        threadId,
        backgroundColor,
        'B',
        name,
        '',
        rs1,
        rs2,
        imm,
        id
      );
    } else if (name === 'JAL') {
      return new Instruction(
        threadName,
        threadId,
        backgroundColor,
        'J',
        name,
        rd,
        '',
        '',
        imm,
        id
      );
    } else {
      return new Instruction(
        threadName,
        threadId,
        backgroundColor,
        'I',
        name,
        rd,
        rs1,
        '',
        imm,
        id
      );
    }
  }

  generateInstructions(
    n: number,
    threadName: string,
    threadId: number,
    backgroundColor: string
  ): Instruction[] {
    let instructions: Instruction[] = [];
    for (let i = 0; i < n; i++) {
      const instruction = this.generateInstruction(
        threadName,
        backgroundColor,
        threadId,
        `${i}`
      );
      instructions.push(instruction);
    }
    return instructions;
  }

  saveThreads() {
    switch (this.tipo) {
      case 'Base':
        this.generateThreads(1, this.THREAD_SIZE);
        break;
      case 'IMT':
        this.generateThreads(this.NUM_THREADS, this.THREAD_SIZE);
        break;
      case 'BMT':
        this.generateThreads(this.NUM_THREADS, this.THREAD_SIZE);
        break;
      case 'SMT':
        this.generateThreads(this.NUM_THREADS, this.THREAD_SIZE);
        break;
    }
  }

  generateThreads(n: number, length: number) {
    const threads: Thread[] = [];
    for (let i = 0; i < n; i++) {
      const threadName = `T${i}`;
      const threadId = i;
      const instructions = this.generateInstructions(
        length,
        threadName,
        threadId,
        this.backgroundColors[i]
      );
      const thread = new Thread(instructions, threadName, i);
      threads.push(thread);
    }
    this.threads = threads;

    // Convertendo os dados para JSON
    const json = JSON.stringify(threads, null, 2);

    // Criando um Blob com os dados JSON
    const blob = new Blob([json], { type: 'application/json' });

    // Fazendo o download do arquivo JSON
    saveAs(blob, 'threads.json');
  }

  loadThreads(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      const file = element.files[0];
      console.log(file);
      const reader = new FileReader();
      reader.onerror = (error) => {
        console.error('Erro ao ler o arquivo:', error);
      };
      reader.onload = (e) => {
        if (e.target) {
          const contents = e.target.result;
          try {
            console.log('Parsing data...');
            const data = JSON.parse(contents as string);
            console.log('Data parsed successfully:', data);

            console.log('Mapping data to threads...');
            const newThreads = data.map(
              (thread: any) =>
                new Thread(
                  thread.instructions.map(
                    (instruction: any) =>
                      new Instruction(
                        instruction.threadName,
                        instruction.threadId,
                        instruction.backgroundColor,
                        instruction.type,
                        instruction.name,
                        instruction.rd,
                        instruction.rs1,
                        instruction.rs2,
                        instruction.imm,
                        instruction.id
                      )
                  ),
                  thread.name,
                  thread.id
                )
            );
            console.log('Data mapped to threads successfully:', newThreads);

            console.log('Clearing original threads array...');
            this.threads.length = 0;

            console.log('Adding new threads to original array...');
            this.threads.push(...newThreads);
            console.log('Finished');
          } catch (error) {
            console.error('Error:', error);
          }
        }
      };
      reader.readAsText(file);
    }
  }

  start(): void {
    switch (this.tipo) {
      case 'Base':
        this.base();
        break;
      case 'IMT':
        this.IMT();
        break;
      case 'BMT':
        this.BMT();
        break;
      case 'SMT':
        this.SMT();
        break;
      default:
        console.log('error');
    }
  }

  async base(): Promise<void> {
    let IDSize = 5;
    let JANELASize = 20;
    let EXSize = 3; // Fixo 3 Unidades Funcionais
    let WBSize = 4;

    this.pipelineHistory.forEach((element) => {
      element.ID = Instruction.nullArray(IDSize);
      element.JANELA = Instruction.nullArray(JANELASize);
      element.EX = [
        new FunctionalUnit('ULA', 2),
        new FunctionalUnit('Desvio', 1),
        new FunctionalUnit('Memória', 1),
      ];
      element.WB = Instruction.nullArray(WBSize);
    });

    let atualRegisterRenamed = 'a';
    let readRegisters: string[] = [];
    let writeRegisters: string[] = [];
    let freeRegisteres: string[] = [];

    let instructionIndex = 0;
    let finished = false;
    while (!finished) {
      // Finalizar instrucoes em WB
      for (let j = 0; j < WBSize; j++) {
        // Remover registrador de destino como possivel dependencia falsa
        const instruction =
          this.pipelineHistory[this.actualLine - 1].WB[j].clone();

        if (instruction.name !== '') {
          const index = writeRegisters.indexOf(instruction.rd);
          if (index > -1) {
            freeRegisteres.push(instruction.rd);
            writeRegisters.splice(index, 1);
          }
        }
        this.pipelineHistory[this.actualLine].WB[j] = Instruction.null();
      }

      // Mover instrucoes de EX para WB
      let nextWBIndex = 0;

      for (let j = 0; j < EXSize; j++) {
        let currentFunctionalUnit =
          this.pipelineHistory[this.actualLine - 1].EX[j];

        // Move todas as instruções da unidade funcional atual para WB
        for (let index = 0; index < currentFunctionalUnit.ocupation; index++) {
          this.pipelineHistory[this.actualLine].WB[nextWBIndex++] =
            currentFunctionalUnit.instructions[index];
        }
      }
      this.dataSource2.data = this.getResultsArray();

      // Mover da Janela para a EX
      let alreadyCount = false;
      let janelaIndex = 0;

      for (let j = 0; j < JANELASize; j++) {
        let instruction =
          this.pipelineHistory[this.actualLine - 1].JANELA[j].clone();

        // Desbloquear instrucoes que tinham dependencia verdadeira
        if (instruction.isBlocked) {
          let index = freeRegisteres.indexOf(instruction.rs1);
          if (index > -1) {
            freeRegisteres.splice(index, 1);
            instruction.isBlocked = false;
          }
        }
        if (instruction.isBlocked) {
          console.log(freeRegisteres);
          const index = freeRegisteres.indexOf(instruction.rs2);
          if (index > -1) {
            freeRegisteres.splice(index, 1);
            instruction.isBlocked = false;
          }
        }

        // Somente tentar inserir se nao houver dependencia
        if (!instruction.isBlocked) {
          // Inserir nas Unidades Funcionais
          let hasInsert =
            this.pipelineHistory[this.actualLine].updateExecution(instruction);

          // Se nao tinha espaco livre para aquela instrucao, repetir na janela de novo
          if (!hasInsert && instruction.name !== '') {
            this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
              instruction;
          }

          // Contabilizar ciclos de execucao
          if (!alreadyCount && instruction.name !== '') {
            this.results.CiclosExecucao++;
            alreadyCount = true;
          }

          // Contabilizar instrucoes executadas
          if (hasInsert && instruction.name !== '') {
            this.results.Instrucoes++;

            // Atualizar buffer de verificacao de dependencia falsa
            if (instruction.rs1 !== '') {
              const index = readRegisters.indexOf(instruction.rs1);
              if (index > -1) {
                readRegisters.splice(index, 1);
              }
            }

            if (instruction.rs2 !== '') {
              const index = readRegisters.indexOf(instruction.rs2);
              if (index > -1) {
                readRegisters.splice(index, 1);
              }
            }
          }
          this.dataSource2.data = this.getResultsArray();
        } else {
          this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
            instruction;
        }
      }

      let IDIndex = 0;

      // Mover do ID para a janela
      // Enquanto tiver espaco livre na janela
      while (janelaIndex < JANELASize && IDIndex < IDSize) {
        let instruction =
          this.pipelineHistory[this.actualLine - 1].ID[IDIndex++].clone();

        if (instruction.name !== '') {
          this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
            instruction;

          // Verificar dependencias falsas
          if (readRegisters.includes(instruction.rd)) {
            // Renomear dependencia falsa
            instruction.rdRenamed = 'R' + atualRegisterRenamed;
            atualRegisterRenamed =
              this.updateRenameRegister(atualRegisterRenamed);
          }

          // Verificar dependencias verdadeiras
          if (
            writeRegisters.includes(instruction.rs1) ||
            writeRegisters.includes(instruction.rs2)
          ) {
            // Renomear dependencia verdadeira
            instruction.isBlocked = true;
            console.log('truee');
          }

          // Marcar registrador de escrita (possivel dependencia verdadeira)
          if (instruction.rd !== '') writeRegisters.push(instruction.rd);

          if (instruction.rs1 !== '') readRegisters.push(instruction.rs1);
          if (instruction.rs2 !== '') readRegisters.push(instruction.rs2);
        }
      }

      // Se sobrou instrucao copiar e manter em ID
      let newIDIndex = 0;

      while (IDIndex < IDSize) {
        let instruction =
          this.pipelineHistory[this.actualLine - 1].ID[IDIndex++].clone();

        if (instruction.name !== '') {
          this.pipelineHistory[this.actualLine].ID[newIDIndex++] = instruction;
        }
      }

      // Preencher estagio ID
      while (
        newIDIndex < IDSize &&
        instructionIndex < this.threads[0].instructions.length
      ) {
        let instruction =
          this.threads[0].instructions[instructionIndex++].clone();

        this.pipelineHistory[this.actualLine].ID[newIDIndex++] = instruction;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      finished =
        instructionIndex >= this.threads[0].instructions.length &&
        this.pipelineHistory[this.actualLine].WB[0].name === '';

      this.actualLine++;

      this.results.IPC =
        this.results.CiclosExecucao != 0
          ? this.results.Instrucoes / this.results.CiclosExecucao
          : 0;
      this.dataSource2.data = this.getResultsArray();
    }
  }

  async IMT(): Promise<void> {
    let IDSize = 5;
    let JANELASize = 20;
    let EXSize = 3; // Fixo 3 Unidades Funcionais
    let WBSize = 4;

    this.pipelineHistory.forEach((element) => {
      element.ID = Instruction.nullArray(IDSize);
      element.JANELA = Instruction.nullArray(JANELASize);
      element.EX = [
        new FunctionalUnit('ULA', 2),
        new FunctionalUnit('Desvio', 1),
        new FunctionalUnit('Memória', 1),
      ];
      element.WB = Instruction.nullArray(WBSize);
    });

    let atualRegisterRenamed = 'a';
    let readRegisters: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);
    let writeRegisters: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);
    let freeRegisteres: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);

    let instructionIndex = 0;

    let finished = new Array(this.NUM_THREADS).fill(false);
    let finishedCount = new Array(this.NUM_THREADS).fill(0);

    let numberThreadOnExecute = 2;

    let started = false;

    while (!finished.every((val) => val === true)) {

      let updatedNumberThread = false;

      for (let pos = 0; pos < this.NUM_THREADS; pos++) {
        if (!finished[pos]) {
          // Finalizar instrucoes em WB
          for (let j = 0; j < WBSize; j++) {
            // Remover registrador de destino como possivel dependencia falsa
            const instruction =
              this.pipelineHistory[this.actualLine - 1].WB[j].clone();

            if (instruction.name !== '') {
              const position = instruction.threadId;
              const index = writeRegisters[position].indexOf(instruction.rd);
              if (index > -1) {
                freeRegisteres[position].push(instruction.rd);
                writeRegisters[position].splice(index, 1);
              }
              finishedCount[position]++;
            }
            this.pipelineHistory[this.actualLine].WB[j] = Instruction.null();
          }

          // Mover instrucoes de EX para WB
          let nextWBIndex = 0;

          for (let j = 0; j < EXSize; j++) {
            let currentFunctionalUnit =
              this.pipelineHistory[this.actualLine - 1].EX[j];

            // Move todas as instruções da unidade funcional atual para WB
            for (
              let index = 0;
              index < currentFunctionalUnit.ocupation;
              index++
            ) {
              this.pipelineHistory[this.actualLine].WB[nextWBIndex++] =
                currentFunctionalUnit.instructions[index];
            }
          }
          this.dataSource2.data = this.getResultsArray();

          // Mover da Janela para a EX
          let alreadyCount = false;
          let janelaIndex = 0;

          let addedEX = false;
          let stop = false;
          let countLoop = 0;
          // Se EX ficar vazio, passar para proxima thread
          STOP:
          while(!addedEX && started && !stop && countLoop < 8) {
            countLoop++;

            for (let j = 0; j < JANELASize; j++) {
              let instruction = this.pipelineHistory[this.actualLine - 1].JANELA[j];

              // Verificar se pertence a thread atual
              const threadAtual = `T${numberThreadOnExecute}`;
              const position = instruction.threadId;

              if (
                instruction.threadName == threadAtual ||
                instruction.threadName == ''
              ) {
                // Desbloquear instrucoes que tinham dependencia verdadeira
                if (instruction.isBlocked) {
                  let index = freeRegisteres[position].indexOf(instruction.rs1);
                  if (index > -1) {
                    freeRegisteres[position].splice(index, 1);
                    instruction.isBlocked = false;
                  }
                }
                if (instruction.isBlocked) {
                  console.log(freeRegisteres);
                  const index = freeRegisteres[position].indexOf(instruction.rs2);
                  if (index > -1) {
                    freeRegisteres[position].splice(index, 1);
                    instruction.isBlocked = false;
                  }
                }

                // Somente tentar inserir se nao houver dependencia
                if (!instruction.isBlocked) {
                  // Inserir nas Unidades Funcionais
                  let hasInsert = this.pipelineHistory[this.actualLine].updateExecution(instruction);

                  // Se nao tinha espaco livre para aquela instrucao, repetir na janela de novo
                  if (!hasInsert && instruction.name !== '') {
                    this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] = instruction;
                  }

                  // Contabilizar ciclos de execucao
                  if (!alreadyCount && instruction.name !== '') {
                    this.results.CiclosExecucao++;
                    addedEX = true;
                    alreadyCount = true;
                  }

                  // Contabilizar instrucoes executadas
                  if (hasInsert && instruction.name !== '') {
                    this.results.Instrucoes++;

                    // Atualizar buffer de verificacao de dependencia falsa
                    if (instruction.rs1 !== '') {
                      const index = readRegisters[position].indexOf(
                        instruction.rs1
                      );
                      if (index > -1) {
                        if (readRegisters[position].length > 1) {
                          readRegisters[position].splice(index, 1);
                        } else {
                          readRegisters[position][index] = '';
                        }
                      }
                    }

                    if (instruction.rs2 !== '') {
                      const index = readRegisters[position].indexOf(
                        instruction.rs2
                      );
                      if (index > -1) {
                        if (readRegisters[position].length > 1) {
                          readRegisters[position].splice(index, 1);
                        } else {
                          readRegisters[position][index] = '';
                        }
                      }
                    }

                    // Verificar se janela esta vazia
                    let subArray = this.pipelineHistory[this.actualLine].JANELA.slice(janelaIndex-1);
                    let lastInstruction = subArray.reverse().find(instruction => instruction.name !== '');
                    let lastNonEmptyName = lastInstruction ? lastInstruction.name : '';

                    if (instruction.name == lastNonEmptyName) stop = true;
                    if(stop) break STOP;

                  }
                  this.dataSource2.data = this.getResultsArray();
                } else {
                  this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] = instruction;
                }
              } else {
                if (!this.pipelineHistory[this.actualLine].JANELA.includes(instruction)) this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] = instruction;
              }
            }
          }

          let IDIndex = 0;

          // Mover do ID para a janela
          // Enquanto tiver espaco livre na janela
          while (janelaIndex < JANELASize && IDIndex < IDSize) {
            let instruction =
              this.pipelineHistory[this.actualLine - 1].ID[IDIndex++];

            if (instruction.name !== '') {
              this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
                instruction;
              started = true;

              // Verificar dependencias falsas
              const position = instruction.threadId;
              //console.log(position)
              console.log(`readRegisters.length = ${readRegisters.length}`);
              console.log(readRegisters[position]);
              if (readRegisters[position].includes(instruction.rd)) {
                // Renomear dependencia falsa
                instruction.rdRenamed = 'R' + atualRegisterRenamed;
                atualRegisterRenamed =
                  this.updateRenameRegister(atualRegisterRenamed);
              }

              // Verificar dependencias verdadeiras
              if (
                writeRegisters[position].includes(instruction.rs1) ||
                writeRegisters[position].includes(instruction.rs2)
              ) {
                // Renomear dependencia verdadeira
                instruction.isBlocked = true;
              }

              // Marcar registrador de escrita (possivel dependencia verdadeira)
              if (instruction.rd !== '')
                writeRegisters[position].push(instruction.rd);

              if (instruction.rs1 !== '')
                readRegisters[position].push(instruction.rs1);
              if (instruction.rs2 !== '')
                readRegisters[position].push(instruction.rs2);
            }
          }

          // Se sobrou instrucao copiar e manter em ID
          let newIDIndex = 0;

          while (IDIndex < IDSize) {
            let instruction =
              this.pipelineHistory[this.actualLine - 1].ID[IDIndex++];

            if (instruction.name !== '') {
              this.pipelineHistory[this.actualLine].ID[newIDIndex++] =
                instruction;
            }
          }

          // Preencher estagio ID
          while (
            newIDIndex < IDSize &&
            instructionIndex < this.threads[pos].instructions.length
          ) {
            let instruction =
              this.threads[pos].instructions[instructionIndex++];

            this.pipelineHistory[this.actualLine].ID[newIDIndex++] =
              instruction;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));

          finished[pos] =
            instructionIndex >= this.threads[pos].instructions.length &&
            finishedCount[pos] === this.threads[pos].instructions.length;

          this.actualLine++;

          this.results.IPC =
            this.results.CiclosExecucao != 0
              ? this.results.Instrucoes / this.results.CiclosExecucao
              : 0;
          this.dataSource2.data = this.getResultsArray();
        }

        if(!updatedNumberThread) numberThreadOnExecute = (numberThreadOnExecute + 1) % this.NUM_THREADS;
      }
    }
  }

  async BMT(): Promise<void> {
    let IDSize = 5;
    let JANELASize = 20;
    let EXSize = 3; // Fixo 3 Unidades Funcionais
    let WBSize = 4;

    this.pipelineHistory.forEach((element) => {
      element.ID = Instruction.nullArray(IDSize);
      element.JANELA = Instruction.nullArray(JANELASize);
      element.EX = [
        new FunctionalUnit('ULA', 2),
        new FunctionalUnit('Desvio', 1),
        new FunctionalUnit('Memória', 1),
      ];
      element.WB = Instruction.nullArray(WBSize);
    });

    let atualRegisterRenamed = 'a';
    let readRegisters: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);
    let writeRegisters: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);
    let freeRegisteres: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);

    let instructionIndex = new Array(this.NUM_THREADS).fill(0);
    let finished = new Array(this.NUM_THREADS).fill(false);
    let finishedCount = new Array(this.NUM_THREADS).fill(0);

    let numberThreadOnExecute = 2;
    let started = false;

    while (!finished.every((val) => val === true)) {

      let updatedNumberThread = false;

      for (let pos = 0; pos < this.NUM_THREADS; pos++) {

        if (!finished[pos]) {

          for (let k = 0; k < this.BLOCK_SIZE; k++) {

            // Finalizar instrucoes em WB
            for (let j = 0; j < WBSize; j++) {
              // Remover registrador de destino como possivel dependencia falsa
              const instruction =
                this.pipelineHistory[this.actualLine - 1].WB[j].clone();

              if (instruction.name !== '') {
                const position = instruction.threadId;
                const index = writeRegisters[position].indexOf(instruction.rd);
                if (index > -1) {
                  freeRegisteres[position].push(instruction.rd);
                  writeRegisters[position].splice(index, 1);
                }
                finishedCount[position]++;
              }
              this.pipelineHistory[this.actualLine].WB[j] = Instruction.null();
            }

            // Mover instrucoes de EX para WB
            let nextWBIndex = 0;

            for (let j = 0; j < EXSize; j++) {
              let currentFunctionalUnit =
                this.pipelineHistory[this.actualLine - 1].EX[j];

              // Move todas as instruções da unidade funcional atual para WB
              for (
                let index = 0;
                index < currentFunctionalUnit.ocupation;
                index++
              ) {
                this.pipelineHistory[this.actualLine].WB[nextWBIndex++] =
                  currentFunctionalUnit.instructions[index];
              }
            }
            this.dataSource2.data = this.getResultsArray();

            // Mover da Janela para a EX
            let alreadyCount = false;
            let janelaIndex = 0;

            let addedEX = false;
            let stop = false;
            let countLoop = 0;

            // Se EX ficar vazio, passar para proxima thread
            // console.log(!addedEX && started && !stop && countLoop < 8);
            STOP:
            while(!addedEX && started && !stop && countLoop < 8) {
              countLoop++;

              for (let j = 0; j < JANELASize; j++) {
                let instruction = this.pipelineHistory[this.actualLine - 1].JANELA[j];

                // Verificar se pertence a thread atual
                let threadAtual = `T${numberThreadOnExecute}`;
                const position = instruction.threadId;

                if (
                  instruction.threadName == threadAtual ||
                  instruction.threadName == ''
                ) {
                  // Desbloquear instrucoes que tinham dependencia verdadeira
                  if (instruction.isBlocked) {
                    let index = freeRegisteres[position].indexOf(instruction.rs1);
                    if (index > -1) {
                      freeRegisteres[position].splice(index, 1);
                      instruction.isBlocked = false;
                    }
                  }

                  if (instruction.isBlocked) {
                    console.log(freeRegisteres);
                    const index = freeRegisteres[position].indexOf(instruction.rs2);
                    if (index > -1) {
                      freeRegisteres[position].splice(index, 1);
                      instruction.isBlocked = false;
                    }
                  }

                  // Somente tentar inserir se nao houver dependencia
                  if (!instruction.isBlocked) {
                    // Inserir nas Unidades Funcionais
                    let hasInsert =
                      this.pipelineHistory[this.actualLine].updateExecution(
                        instruction
                      );

                    // Se nao tinha espaco livre para aquela instrucao, repetir na janela de novo
                    if (!hasInsert && instruction.name !== '') {
                      this.pipelineHistory[this.actualLine].JANELA[ janelaIndex++] = instruction.clone();;
                    }

                    // Contabilizar ciclos de execucao
                    if (!alreadyCount && instruction.name !== '') {
                      this.results.CiclosExecucao++;
                      addedEX = true;
                      alreadyCount = true;
                    }

                    // Contabilizar instrucoes executadas
                    if (hasInsert && instruction.name !== '') {
                      this.results.Instrucoes++;

                      // Atualizar buffer de verificacao de dependencia falsa
                      if (instruction.rs1 !== '') {
                        const index = readRegisters[position].indexOf(
                          instruction.rs1
                        );
                        if (index > -1) {
                          if (readRegisters[position].length > 1) {
                            readRegisters[position].splice(index, 1);
                          } else {
                            readRegisters[position][index] = '';
                          }
                        }
                      }

                      if (instruction.rs2 !== '') {
                        const index = readRegisters[position].indexOf(
                          instruction.rs2
                        );
                        if (index > -1) {
                          if (readRegisters[position].length > 1) {
                            readRegisters[position].splice(index, 1);
                          } else {
                            readRegisters[position][index] = '';
                          }
                        }
                      }

                      // Verificar se janela esta vazia
                      let subArray = this.pipelineHistory[this.actualLine].JANELA.slice(janelaIndex-1);
                      let lastInstruction = subArray.reverse().find(instruction => instruction.name !== '');
                      let lastNonEmptyName = lastInstruction ? lastInstruction.name : '';
  
                      if (instruction.name == lastNonEmptyName) stop = true;
                      if(stop) {
                        numberThreadOnExecute = (numberThreadOnExecute + 1) % this.NUM_THREADS;
                        updatedNumberThread = true;
                        break STOP;
                      }

                    }
                    this.dataSource2.data = this.getResultsArray();
                  } else {
                    this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] = instruction.clone();
                  }
                } else {
                  // Desbloquear instrucoes que tinham dependencia verdadeira
                  if (instruction.isBlocked) {
                    let index = freeRegisteres[position].indexOf(instruction.rs1);
                    if (index > -1) {
                      freeRegisteres[position].splice(index, 1);
                      instruction.isBlocked = false;
                    }
                  }

                  if (instruction.isBlocked) {
                    console.log(freeRegisteres);
                    const index = freeRegisteres[position].indexOf(instruction.rs2);
                    if (index > -1) {
                      freeRegisteres[position].splice(index, 1);
                      instruction.isBlocked = false;
                    }
                  }
                  // if (!this.pipelineHistory[this.actualLine].JANELA.some(i => i.id === instruction.id)) {
                  //   this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] = instruction.clone();
                  // }
                }
              }
              numberThreadOnExecute = (numberThreadOnExecute + 1) % this.NUM_THREADS;
              updatedNumberThread = true;
            }
  
            let IDIndex = 0;

            // Mover do ID para a janela
            // Enquanto tiver espaco livre na janela
            while (janelaIndex < JANELASize && IDIndex < IDSize) {
              let instruction =
                this.pipelineHistory[this.actualLine - 1].ID[IDIndex++];

              if (instruction.name !== '') {
                this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
                  instruction;
                started = true;

                // Verificar dependencias falsas
                const position = instruction.threadId;
                //console.log(position)
                console.log(`readRegisters.length = ${readRegisters.length}`);
                console.log(readRegisters[position]);
                if (readRegisters[position].includes(instruction.rd)) {
                  // Renomear dependencia falsa
                  instruction.rdRenamed = 'R' + atualRegisterRenamed;
                  atualRegisterRenamed =
                    this.updateRenameRegister(atualRegisterRenamed);
                }

                // Verificar dependencias verdadeiras
                if (
                  writeRegisters[position].includes(instruction.rs1) ||
                  writeRegisters[position].includes(instruction.rs2)
                ) {
                  // Renomear dependencia verdadeira
                  instruction.isBlocked = true;
                }

                // Marcar registrador de escrita (possivel dependencia verdadeira)
                if (instruction.rd !== '')
                  writeRegisters[position].push(instruction.rd);

                if (instruction.rs1 !== '')
                  readRegisters[position].push(instruction.rs1);
                if (instruction.rs2 !== '')
                  readRegisters[position].push(instruction.rs2);
              }
            }

            // Se sobrou instrucao copiar e manter em ID
            let newIDIndex = 0;

            while (IDIndex < IDSize) {
              let instruction =
                this.pipelineHistory[this.actualLine - 1].ID[IDIndex++];

              if (instruction.name !== '') {
                this.pipelineHistory[this.actualLine].ID[newIDIndex++] =
                  instruction;
              }
            }

            // Preencher estagio ID
            while (
              newIDIndex < IDSize &&
              instructionIndex[pos] < this.threads[pos].instructions.length
            ) {
              let instruction =
                this.threads[pos].instructions[instructionIndex[pos]++];

              this.pipelineHistory[this.actualLine].ID[newIDIndex++] =
                instruction;
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));

            finished[pos] =
            instructionIndex[pos] >= this.threads[pos].instructions.length &&
            finishedCount[pos] === this.threads[pos].instructions.length;

            this.actualLine++;

            this.results.IPC =
              this.results.CiclosExecucao != 0
                ? this.results.Instrucoes / this.results.CiclosExecucao
                : 0;
            this.dataSource2.data = this.getResultsArray();
          }
          numberThreadOnExecute = (numberThreadOnExecute + 1) % this.NUM_THREADS;
        }
      }
    }
  }

  async SMT(): Promise<void> {
    const IDSize = 5;
    const JANELASize = 20;
    const EXSize = 3;
    const WBSize = 4;

    // Inicialização dos arrays do pipeline
    this.pipelineHistory.forEach((element) => {
      element.ID = Array(IDSize).fill(Instruction.null());
      element.JANELA = Array(JANELASize).fill(Instruction.null());
      element.EX = [
        new FunctionalUnit('ULA', 2),
        new FunctionalUnit('Desvio', 1),
        new FunctionalUnit('Memória', 1),
      ];
      element.WB = Array(WBSize).fill(Instruction.null());
    });

    let atualRegisterRenamed = 'a';
    let readRegisters: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);
    let writeRegisters: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);
    let freeRegisters: string[][] = new Array(this.NUM_THREADS)
      .fill(null)
      .map(() => []);

    let instructionIndex = new Array(this.NUM_THREADS).fill(0);
    let finished = new Array(this.NUM_THREADS).fill(false);
    let finishedCount = new Array(this.NUM_THREADS).fill(0);

    while (!finished.every((val) => val === true)) {
      for (let pos = 0; pos < this.NUM_THREADS; pos++) {
        if (!finished[pos]) {
          // WB Stage
          for (let j = 0; j < WBSize; j++) {
            const instruction =
              this.pipelineHistory[this.actualLine - 1].WB[j].clone();
            if (instruction.name !== '') {
              const position = instruction.threadId;
              const index = writeRegisters[position].indexOf(instruction.rd);
              if (index > -1) {
                freeRegisters[position].push(instruction.rd);
                writeRegisters[position].splice(index, 1);
              }
              finishedCount[position]++;
            }
            this.pipelineHistory[this.actualLine].WB[j] = Instruction.null();
          }

          // EX Stage
          let nextWBIndex = 0;
          for (let j = 0; j < EXSize; j++) {
            const currentFunctionalUnit =
              this.pipelineHistory[this.actualLine - 1].EX[j];
            for (
              let index = 0;
              index < currentFunctionalUnit.ocupation;
              index++
            ) {
              this.pipelineHistory[this.actualLine].WB[nextWBIndex++] =
                currentFunctionalUnit.instructions[index];
            }
          }

          // JANELA Stage
          let alreadyCount = false;
          let janelaIndex = 0;
          for (let j = 0; j < JANELASize; j++) {
            let instruction =
              this.pipelineHistory[this.actualLine - 1].JANELA[j];
            const threadAtual = `T${pos}`;
            const position = instruction.threadId;

            if (instruction.isBlocked) {
              let index = freeRegisters[position].indexOf(instruction.rs1);
              if (index > -1) {
                freeRegisters[position].splice(index, 1);
                instruction.isBlocked = false;
              }
            }
            if (instruction.isBlocked) {
              const index = freeRegisters[position].indexOf(instruction.rs2);
              if (index > -1) {
                freeRegisters[position].splice(index, 1);
                instruction.isBlocked = false;
              }
            }

            if (!instruction.isBlocked) {
              let hasInsert =
                this.pipelineHistory[this.actualLine].updateExecution(
                  instruction
                );
              if (!hasInsert && instruction.name !== '') {
                this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
                  instruction;
              }

              if (!alreadyCount && instruction.name !== '') {
                this.results.CiclosExecucao++;
                alreadyCount = true;
              }

              if (hasInsert && instruction.name !== '') {
                this.results.Instrucoes++;
                if (instruction.rs1 !== '') {
                  const index = readRegisters[position].indexOf(
                    instruction.rs1
                  );
                  if (index > -1) {
                    readRegisters[position].splice(index, 1);
                  }
                }

                if (instruction.rs2 !== '') {
                  const index = readRegisters[position].indexOf(
                    instruction.rs2
                  );
                  if (index > -1) {
                    readRegisters[position].splice(index, 1);
                  }
                }
              }
              this.dataSource2.data = this.getResultsArray();
            } else {
              this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
                instruction;
            }
          }

          // ID Stage
          let IDIndex = 0;
          while (janelaIndex < JANELASize && IDIndex < IDSize) {
            let instruction =
              this.pipelineHistory[this.actualLine - 1].ID[IDIndex++];
            if (instruction.name !== '') {
              this.pipelineHistory[this.actualLine].JANELA[janelaIndex++] =
                instruction;

              const position = instruction.threadId;
              if (readRegisters[position].includes(instruction.rd)) {
                instruction.rdRenamed = 'R' + atualRegisterRenamed;
                atualRegisterRenamed =
                  this.updateRenameRegister(atualRegisterRenamed);
              }

              if (
                writeRegisters[position].includes(instruction.rs1) ||
                writeRegisters[position].includes(instruction.rs2)
              ) {
                instruction.isBlocked = true;
              }

              if (instruction.rd !== '')
                writeRegisters[position].push(instruction.rd);
              if (instruction.rs1 !== '')
                readRegisters[position].push(instruction.rs1);
              if (instruction.rs2 !== '')
                readRegisters[position].push(instruction.rs2);
            }
          }

          let newIDIndex = 0;
          while (IDIndex < IDSize) {
            let instruction =
              this.pipelineHistory[this.actualLine - 1].ID[IDIndex++];
            if (instruction.name !== '') {
              this.pipelineHistory[this.actualLine].ID[newIDIndex++] =
                instruction;
            }
          }

          while (
            newIDIndex < IDSize &&
            instructionIndex[pos] < this.threads[pos].instructions.length
          ) {
            let instruction =
              this.threads[pos].instructions[instructionIndex[pos]++];
            this.pipelineHistory[this.actualLine].ID[newIDIndex++] =
              instruction;
          }

          // Verifica se a thread foi finalizada
          finished[pos] =
            instructionIndex[pos] >= this.threads[pos].instructions.length &&
            finishedCount[pos] === this.threads[pos].instructions.length;

          // Incrementa a linha atual do pipeline
          this.actualLine++;

          // Atualiza IPC
          this.results.IPC =
            this.results.CiclosExecucao !== 0
              ? this.results.Instrucoes / this.results.CiclosExecucao
              : 0;
          this.dataSource2.data = this.getResultsArray();

          // Await opcional para permitir pausa entre as iterações do loop
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
  }
}

export class Instruction {
  threadName: string;
  threadId: number;
  backgroundColor: string;
  type: string;
  name: string;
  rd: string;
  rdRenamed: string;
  rs1: string;
  rs2: string;
  imm: number;
  id: string;
  isBlocked: boolean;

  constructor(
    threadName: string,
    threadId: number,
    backgroundColor: string,
    type: string,
    name: string,
    rd: string,
    rs1: string,
    rs2: string,
    imm: number,
    id: string
  ) {
    this.threadName = threadName;
    this.threadId = threadId;
    this.backgroundColor = backgroundColor;
    this.type = type;
    this.name = name;
    this.rd = rd;
    this.rdRenamed = '';
    this.rs1 = rs1;
    this.rs2 = rs2;
    this.imm = imm;
    this.isBlocked = false;
    this.id = 'id' + threadId + threadId
  }

  clone(): Instruction {
    return new Instruction(
      this.threadName,
      this.threadId,
      this.backgroundColor,
      this.type,
      this.name,
      this.rd,
      this.rs1,
      this.rs2,
      this.imm,
      this.id
    );
  }

  toString(): string {
    switch (this.type) {
      case 'R':
        return `${this.threadName}: ${this.name} ${
          this.rdRenamed !== '' ? this.rdRenamed : this.rd
        }, ${this.rs1}, ${this.rs2}`;
      case 'I':
        return `${this.threadName}: ${this.name} ${
          this.rdRenamed !== '' ? this.rdRenamed : this.rd
        }, ${this.imm}(${this.rs1})`;
      case 'S':
        return `${this.threadName}: ${this.name} ${this.rs1}, ${this.rs2}(${this.imm})`;
      case 'B':
        return `${this.threadName}: ${this.name} ${this.rs1}, ${this.rs2}, ${this.imm}`;
      case 'J':
        return `${this.threadName}: ${this.name} ${
          this.rdRenamed !== '' ? this.rdRenamed : this.rd
        }, ${this.imm}`;
      case 'F':
        return `${this.threadName}: ${this.name} ${
          this.rdRenamed !== '' ? this.rdRenamed : this.rd
        }, ${this.rs1}, ${this.rs2}`;
      case 'Bubble':
        return `${this.threadName}: ${this.type}`;
      default:
        return '';
    }
  }

  static null(): Instruction {
    return new Instruction('', -1, 'transparent', '', '', '', '', '', -1, '-1');
  }

  static nullArray(n: number): Instruction[] {
    return Array.from(
      { length: n },
      () => new Instruction('', -1, 'transparent', '', '', '', '', '', -1, '-1')
    );
  }

  static bubble(threadName: string, threadId: number, id: string): Instruction {
    return new Instruction(
      threadName,
      threadId,
      'gray',
      'Bubble',
      '',
      '',
      '',
      '',
      -1,
      id
    );
  }
}

export class Thread {
  instructions: Instruction[];
  name: string;
  id: number;

  constructor(instructions: Instruction[], name: string, id: number) {
    this.instructions = instructions;
    this.name = name;
    this.id = id;
  }

  toString(): string {
    return (
      `${this.name}: \n` +
      this.instructions.map((instruction) => instruction.toString()).join('\n')
    );
  }
}

export class FunctionalUnit {
  name: string;
  instructions: Instruction[];
  capacity: number;
  ocupation: number;

  constructor(name: string, capacity: number) {
    this.name = name;
    this.instructions = new Array(capacity).fill(Instruction.null());
    this.capacity = capacity;
    this.ocupation = 0;
  }

  isFull(): boolean {
    return this.capacity === this.ocupation;
  }

  insert(instruction: Instruction): boolean {
    if (this.isFull()) {
      return false;
    }
    this.instructions[this.ocupation++] = instruction;
    return true;
  }

  clear(): void {
    this.instructions.splice(
      0,
      this.instructions.length,
      ...new Array(this.capacity).fill(Instruction.null())
    );
    this.ocupation = 0;
  }
}

export class SuperScalarPipeline {
  ID: Instruction[];
  JANELA: Instruction[];
  EX: FunctionalUnit[];
  WB: Instruction[];
  EXHistory: FunctionalUnit[][];

  constructor() {
    this.ID = Instruction.nullArray(5);
    this.JANELA = Instruction.nullArray(5);
    this.EX = [
      new FunctionalUnit('ULA', 4),
      new FunctionalUnit('Desvio', 2),
      new FunctionalUnit('Memória', 2),
    ];
    this.WB = Instruction.nullArray(8);
    this.EXHistory = []; // E esta linha
  }

  static getNullArray(n: number): SuperScalarPipeline[] {
    let pipelines = new Array<SuperScalarPipeline>();
    for (let i = 0; i < n; i++) {
      pipelines.push(new SuperScalarPipeline());
    }
    return pipelines;
  }

  updateExecution(instruction: Instruction): boolean {
    // Instrucao null
    if (instruction.name === '') return false;

    const aluInstructions = new Set([
      'ADD',
      'SUB',
      'AND',
      'OR',
      'XOR',
      'SLL',
      'SRL',
      'SRA',
      'SLT',
      'SLTU', // ULA
      'MUL',
      'MULH',
      'MULHSU',
      'MULHU',
      'DIV',
      'DIVU',
      'REM',
      'REMU',
    ]);
    const branchInstructions = new Set([
      'BEQ',
      'BNE',
      'BLT',
      'BGE',
      'BLTU',
      'BGEU',
      'JAL',
      'JALR',
    ]);
    const memInstructions = new Set([
      'LB',
      'LH',
      'LW',
      'LBU',
      'LHU',
      'SB',
      'SH',
      'SW',
    ]);

    if (aluInstructions.has(instruction.name)) {
      return this.EX[0].insert(instruction);
    } else if (branchInstructions.has(instruction.name)) {
      return this.EX[1].insert(instruction);
    } else if (memInstructions.has(instruction.name)) {
      return this.EX[2].insert(instruction);
    } else {
      return false;
    }
  }
}
