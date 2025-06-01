import { Component, Input,  ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { saveAs } from 'file-saver';

export class InstructionResult {
  CPI: number = 0; 
  Bolhas: number = 0;
  Ciclos: number = 0;
  Instrucoes: number = 0;
}
@Component({
  selector: 'app-escalar',
  templateUrl: './escalar.component.html',
  styleUrls: ['./escalar.component.scss']
})
export class EscalarComponent {

  NUM_THREADS = 4;
  THREAD_SIZE = 20;
  BLOCK_SIZE = 5;

  @Input() tipo: string = "";
  constructor(private cdRef: ChangeDetectorRef) {}
 
  ngAfterViewInit() {
    this.cdRef.detectChanges();
  }

  displayedColumns: string[] = ['#', 'IF', 'ID', 'EX', 'MEM', 'WB']; 
  pipelineHistory: ScalarPipeline[] = ScalarPipeline.getNullArray(120);
  dataSource = new MatTableDataSource<ScalarPipeline>(this.pipelineHistory);
  actualLine = 1;

  displayedColumns2: string[] = ['name', 'result'];
  results = new InstructionResult;
  dataSource2 = new MatTableDataSource<{ name: string, result: number }>(this.getResultsArray());
  
  threads: Thread[] = [];
  buttonText = 'Gerar Thread';
  step = 1;

  backgroundColors: string[] = ['green', 'red', 'orange', 'blue'];
  instructionNames: string[] = [
    'ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLL', 'SRL', 'SRA','SLT', 'SLTU',   // ULA
    'MUL', 'MULH', 'MULHSU', 'MULHU', 'DIV', 'DIVU', 'REM', 'REMU',        // ULA
    'LB', 'LH', 'LW', 'LBU', 'LHU', 'SB', 'SH', 'SW',                      // MEMORIA
    'BEQ', 'BNE', 'BLT', 'BGE', 'BLTU', 'BGEU', 'JAL', 'JALR',             // DESVIO
  ];

  getResultsArray(): { name: string, result: number }[] {
    return Object.keys(this.results).map(key => ({
      name: key,
      result: (this.results as any)[key]
    }));
  }

  getRandomInstructionName(): string {
      const randomIndex = Math.floor(Math.random() * this.instructionNames.length);
      return this.instructionNames[randomIndex];
  }

  getRandomRegister(): string {    
      return 'R' + Math.floor(Math.random() * 32);
  }

  getRandomImmediate(): number {
    return Math.floor(Math.random() * 1000);
  }

  changeButtonText(newText: string): void {
    this.buttonText = newText;
  }

  generateInstruction(threadName: string, backgroundColor: string): Instruction {
    const name = this.getRandomInstructionName();
    const rd = this.getRandomRegister();
    const rs1 = this.getRandomRegister();
    const rs2 = this.getRandomRegister();
    const imm = this.getRandomImmediate();

    if (['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SLL', 'SRL', 'SRA', 'SLT', 'SLTU', 'MUL', 'MULH', 'MULHSU', 'MULHU', 'DIV', 'DIVU', 'REM', 'REMU'].includes(name)) {
        return new Instruction(threadName, backgroundColor,'R', name, rd, rs1, rs2, 0);

    } else if (['LB', 'LH', 'LW', 'LBU', 'LHU'].includes(name)) {
        return new Instruction(threadName, backgroundColor, 'I', name, rd, rs1, '', imm);

    } else if (['SB', 'SH', 'SW'].includes(name)) {
        return new Instruction(threadName, backgroundColor, 'S', name, '', rs1, rs2, imm);

    } else if (['BEQ', 'BNE', 'BLT', 'BGE', 'BLTU', 'BGEU'].includes(name)) {
        return new Instruction(threadName, backgroundColor, 'B', name, '', rs1, rs2, imm);

    } else if (name === 'JAL') {
        return new Instruction(threadName, backgroundColor, 'J', name, rd, '', '', imm);

    } else {
        return new Instruction(threadName, backgroundColor, 'I', name, rd, rs1, '', imm);
    }
  }

  generateInstructions(n: number, threadName: string, backgroundColor: string): Instruction[] {
    let instructions: Instruction[] = [];
    for (let i = 0; i < n; i++) {
        const instruction = this.generateInstruction(threadName, backgroundColor);
        instructions.push(instruction);
    }

    // Atualizar ultimas instrucoes como null
    switch (this.tipo) {

      case 'Base':
      for (let i = 0; i < 5; i++) {
        const instruction = Instruction.null();
        instructions.push(instruction);
      }
      break;

      case 'IMT':
        let i = threadName == 'T1' ? 2 : 1
        for(let j = 0; j < i; j++) {
          const instruction = Instruction.null();
          instructions.push(instruction);
        }
      break;

      case 'BMT':
        if(threadName == 'T1') {
          for (let i = 0; i < 5; i++) {
            const instruction = Instruction.null();
            instructions.push(instruction);
          }
        }
      break;

      default : console.log('error');
    }
    return instructions;
  }

  saveThreads() {
    switch (this.tipo) {
      case 'Base': this.generateThreads(1, this.THREAD_SIZE); break;
      case 'IMT': this.generateThreads(this.NUM_THREADS, this.THREAD_SIZE); break;
      case 'BMT': this.generateThreads(this.NUM_THREADS, this.THREAD_SIZE); break;
    }
  }

  generateThreads(n: number, length: number) {
    const threads: Thread[] = [];
    for (let i = 0; i < n; i++) {
        const threadName = `T${i+1}`;
        const instructions = this.generateInstructions(length, threadName, this.backgroundColors[i]);
        const thread = new Thread(instructions, threadName);
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
            const newThreads = data.map((thread: any) => new Thread(
              thread.instructions.map((instruction: any) => new Instruction(
                instruction.threadName,
                instruction.backgroundColor,
                instruction.type,
                instruction.name,
                instruction.rd,
                instruction.rs1,
                instruction.rs2,
                instruction.imm
              )),
              thread.name
            ));
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
      case 'Base': this.base(); break;
      case 'IMT':  this.IMT();  break;
      case 'BMT':  this.BMT();  break;
      default : console.log('error');
    }
  }

  async base(): Promise<void> {

    console.log(this.threads);
  
    this.pipelineHistory.forEach(element => {
      element.IF = Instruction.null();
      element.ID = Instruction.null();
      element.EX = Instruction.null();
      element.MEM = Instruction.null();
      element.WB = Instruction.null();
    });
  
    for (let i = 0; i < this.threads[0].instructions.length; i++) {

      if(i != this.threads[0].instructions.length-2) {
        this.results.Ciclos++;
      }

      this.pipelineHistory[this.actualLine].WB = this.pipelineHistory[this.actualLine-1].MEM;
      this.pipelineHistory[this.actualLine].MEM = this.pipelineHistory[this.actualLine-1].EX;

      // Verificar dependencia verdadeira
      if(
        (this.pipelineHistory[this.actualLine-1].ID.rs1 != '' && this.pipelineHistory[this.actualLine-1].ID.rs2 != '') &&
        (this.pipelineHistory[this.actualLine].WB.rd  == this.pipelineHistory[this.actualLine-1].ID.rs1 ||
         this.pipelineHistory[this.actualLine].WB.rd  == this.pipelineHistory[this.actualLine-1].ID.rs2 ||
         this.pipelineHistory[this.actualLine].MEM.rd == this.pipelineHistory[this.actualLine-1].ID.rs1 ||
         this.pipelineHistory[this.actualLine].MEM.rd == this.pipelineHistory[this.actualLine-1].ID.rs2)
      )
      {
        // Bolha
        this.pipelineHistory[this.actualLine].EX = Instruction.bubble(this.threads[0].name);
        this.pipelineHistory[this.actualLine].ID = this.pipelineHistory[this.actualLine-1].ID;
        this.pipelineHistory[this.actualLine].IF = this.pipelineHistory[this.actualLine-1].IF;              
        this.results.Bolhas++;
        i--;
      } else {
        this.pipelineHistory[this.actualLine].EX = this.pipelineHistory[this.actualLine-1].ID;
        this.pipelineHistory[this.actualLine].ID = this.pipelineHistory[this.actualLine-1].IF;
        this.pipelineHistory[this.actualLine].IF = this.threads[0].instructions[i];
      }
  
      if(this.pipelineHistory[this.actualLine].WB.name != '') {
        this.results.Instrucoes++;
      }

      this.actualLine++;
      this.results.CPI = this.results.Instrucoes != 0 ? this.results.Ciclos/this.results.Instrucoes : 0;
      this.dataSource2.data = this.getResultsArray();

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async IMT(): Promise<void> {

    this.pipelineHistory.forEach(element => {
      element.IF = Instruction.null();
      element.ID = Instruction.null();
      element.EX = Instruction.null();
      element.MEM = Instruction.null();
      element.WB = Instruction.null();
    });
  
    for (let i = 0; i < this.threads[0].instructions.length; i++) {   // Considerando que todas threads têm mesmo tamanho
      for(let j = 0; j < this.NUM_THREADS; j++) {

        if(i != this.threads[0].instructions.length-1) {
          this.results.Ciclos++;
          this.dataSource2.data = this.getResultsArray();
        } else break;

        this.pipelineHistory[this.actualLine].WB = this.pipelineHistory[this.actualLine-1].MEM;
        this.pipelineHistory[this.actualLine].MEM = this.pipelineHistory[this.actualLine-1].EX;
        this.pipelineHistory[this.actualLine].EX = this.pipelineHistory[this.actualLine-1].ID;
        this.pipelineHistory[this.actualLine].ID = this.pipelineHistory[this.actualLine-1].IF;
        this.pipelineHistory[this.actualLine].IF = this.threads[j].instructions[i];

        if(this.pipelineHistory[this.actualLine].WB.name != '') {
          this.results.Instrucoes++;
        }

        this.actualLine++;
        this.results.CPI = this.results.Instrucoes != 0 ? this.results.Ciclos/this.results.Instrucoes : 0;
        this.dataSource2.data = this.getResultsArray();

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async BMT(): Promise<void> {
  
    this.pipelineHistory.forEach(element => {
      element.IF = Instruction.null();
      element.ID = Instruction.null();
      element.EX = Instruction.null();
      element.MEM = Instruction.null();
      element.WB = Instruction.null();
    });

    let finishedSMT = false;
    let threadSize = this.threads[0].instructions.length/this.BLOCK_SIZE;

    for (let i = 0; i < threadSize; i++) {   // Considerando que todas threads têm mesmo tamanho
      for(let j = 0; j < this.NUM_THREADS; j++) {

        if (!finishedSMT) {

          finishedSMT = i==threadSize-1 ? true : false;

          for(let k = 0; k < this.BLOCK_SIZE; k++) {

            if(!finishedSMT || k !== this.BLOCK_SIZE-1) {
              this.results.Ciclos++;
              this.dataSource2.data = this.getResultsArray(); 
            }

            this.pipelineHistory[this.actualLine].WB = this.pipelineHistory[this.actualLine-1].MEM;
            this.pipelineHistory[this.actualLine].MEM = this.pipelineHistory[this.actualLine-1].EX;

            // Verificar dependencia verdadeira
            if(
              (this.pipelineHistory[this.actualLine-1].ID.rs1 != '' && this.pipelineHistory[this.actualLine-1].ID.rs2 != '') 
              
              &&
              ((this.pipelineHistory[this.actualLine].WB.rd  == this.pipelineHistory[this.actualLine-1].ID.rs1 ||
                this.pipelineHistory[this.actualLine].WB.rd  == this.pipelineHistory[this.actualLine-1].ID.rs2) && 
                (this.pipelineHistory[this.actualLine].WB.threadName == this.pipelineHistory[this.actualLine-1].ID.threadName)
               
               ||
      
               (this.pipelineHistory[this.actualLine].MEM.rd  == this.pipelineHistory[this.actualLine-1].ID.rs1 ||
                this.pipelineHistory[this.actualLine].MEM.rd  == this.pipelineHistory[this.actualLine-1].ID.rs2) && 
                (this.pipelineHistory[this.actualLine].MEM.threadName == this.pipelineHistory[this.actualLine-1].ID.threadName)
              )
            )
            {
              // Bolha
              this.pipelineHistory[this.actualLine].EX = Instruction.bubble(this.pipelineHistory[this.actualLine-1].ID.threadName);
              this.pipelineHistory[this.actualLine].ID = this.pipelineHistory[this.actualLine-1].ID;
              this.pipelineHistory[this.actualLine].IF = this.pipelineHistory[this.actualLine-1].IF;              
              this.results.Bolhas++;
              k--;
            } else {
              this.pipelineHistory[this.actualLine].EX = this.pipelineHistory[this.actualLine-1].ID;
              this.pipelineHistory[this.actualLine].ID = this.pipelineHistory[this.actualLine-1].IF;
              this.pipelineHistory[this.actualLine].IF = this.threads[j].instructions[i*this.BLOCK_SIZE+k];
            }
        
            if(this.pipelineHistory[this.actualLine].WB.name !== '') {
              this.results.Instrucoes++;
            }
            
            this.actualLine++;
            this.results.CPI = this.results.Instrucoes != 0 ? this.results.Ciclos/this.results.Instrucoes : 0;
            this.dataSource2.data = this.getResultsArray();

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          console.log(finishedSMT);
        }
      }
    }
  }
}

export class Instruction {
  threadName: string;
  backgroundColor: string;
  type: string;
  name: string;
  rd: string;
  rs1: string;
  rs2: string;
  imm: number;

  constructor(threadName: string, backgroundColor: string, type: string, name: string, rd: string, rs1: string, rs2: string, imm: number) {
      this.threadName = threadName;
      this.backgroundColor = backgroundColor;
      this.type = type;
      this.name = name;
      this.rd = rd;
      this.rs1 = rs1;
      this.rs2 = rs2;
      this.imm = imm;
  }

  toString(): string {
      switch (this.type) {
          case 'R':
              return `${this.threadName}: ${this.name} ${this.rd}, ${this.rs1}, ${this.rs2}`;
          case 'I':
              return `${this.threadName}: ${this.name} ${this.rd}, ${this.imm}(${this.rs1})`;
          case 'S':
              return `${this.threadName}: ${this.name} ${this.rs1}, ${this.rs2}(${this.imm})`;
          case 'B':
              return `${this.threadName}: ${this.name} ${this.rs1}, ${this.rs2}, ${this.imm}`;
          case 'J':
              return `${this.threadName}: ${this.name} ${this.rd}, ${this.imm}`;
          case 'F':
              return `${this.threadName}: ${this.name} ${this.rd}, ${this.rs1}, ${this.rs2}`;
          case 'Bubble':
              return `${this.threadName}: ${this.type}`;
          default:
              return '';
      }
  }

  static null(): Instruction {
    return new Instruction('', 'transparent', '', '', '', '', '', -1);
  }

  static bubble(threadName: string): Instruction {
    return new Instruction(threadName, 'gray', 'Bubble', '', '', '', '', -1);
  }
}

export class Thread {
  instructions: Instruction[];
  name: string;

  constructor(instructions: Instruction[], name: string) {
      this.instructions = instructions;
      this.name = name;
  }

  toString(): string {
      return `${this.name}: \n` + this.instructions.map(instruction => instruction.toString()).join('\n');
  }
}

export class ScalarPipeline {
  IF: Instruction;
  ID: Instruction;
  EX: Instruction;
  MEM: Instruction;
  WB: Instruction;

  constructor() {
    this.IF = Instruction.null();
    this.ID = Instruction.null();
    this.EX = Instruction.null();
    this.MEM = Instruction.null();
    this.WB = Instruction.null();
  }

  static getNullArray(n: number): ScalarPipeline[] {
    let pipelines = new Array<ScalarPipeline>();
    for(let i = 0; i < n; i++) {
      pipelines.push(new ScalarPipeline())
    }
    return pipelines;
  }
}