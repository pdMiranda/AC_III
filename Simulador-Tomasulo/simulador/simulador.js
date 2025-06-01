 Estado = class  {
    constructor(CONFIG, instrucoes) {
        // salva as configurações passadas
        this.configuracao = {
            "numInstrucoes": CONFIG["nInst"], // quantidade de instrucoes
            "ciclos": CONFIG["ciclos"],       // numero de ciclos gastos por cada UF
            "unidades": CONFIG["unidades"]    // número de ufs
        };

        this.branchSpeculation = {
            active: false,
            branchIndex: null,
            predictedTaken: false,
            speculativeInstructions: []
        };

        this.branchSpeculationHistory = [];

        // cria o vetor de instrucoes
        this.estadoInstrucoes = [];
        for(let i = 0; i < this.configuracao["numInstrucoes"]; i++) {
            let linha = {}
            linha["instrucao"] = {                      // armazena a instrucao
                "operacao": instrucoes[i]["d"],
                "registradorR": instrucoes[i]["r"],
                "registradorS": instrucoes[i]["s"],
                "registradorT": instrucoes[i]["t"],
            };

            linha["posicao"] = i;                      // numero da instrucao
            linha["issue"] = null;                     // ciclo onde ocorreu o issue
            linha["exeCompleta"] = null;               // ciclo onde a execucao terminou
            linha["write"] = null;                     // ciclo onde foi escrito
            linha["busy"] = false;                     // se instrução está busy ou não 
            this.estadoInstrucoes[i] = linha;

        }

        // cria as unidades funcionais
        this.unidadesFuncionais = {};
        for (var tipoUnidade in CONFIG["unidades"]) {
            for (let i = 0; i < CONFIG["unidades"][tipoUnidade]; i++) {
                let unidadeFuncional = {};
                unidadeFuncional["instrucao"] = null;           // armazena a instrucao que esta executando
                unidadeFuncional["estadoInstrucao"] = null;     // armazena todo o estado da instrucao
                unidadeFuncional["tipoUnidade"] = tipoUnidade;  // define o tipo da unidade funcional
                unidadeFuncional["tempo"] = null;               // salva quanto tempo ainda falta para terminar a exeucao

                let nome = tipoUnidade + (i+1);                 // cria o nome da uf
                unidadeFuncional["nome"] = nome;
                unidadeFuncional["ocupado"] = false;            // se a unidade esta ocupada ou nao

                unidadeFuncional["operacao"] = null;            // nome da instrucao que esta executando
                unidadeFuncional["vj"] = null;                  // valor de j
                unidadeFuncional["vk"] = null;                  // valor de k
                unidadeFuncional["qj"] = null;                  // uf que esta gerando j
                unidadeFuncional["qk"] = null;                  // uf que esta gerando k

                this.unidadesFuncionais[nome] = unidadeFuncional;
            }

        }

        // cria as unidades funcionais da memoria
        this.unidadesFuncionaisMemoria = {}
        for(var tipoUnidade in CONFIG["unidadesMem"]) {
            for(let i = 0; i < CONFIG["unidadesMem"][tipoUnidade]; i++) {
                let unidadeFuncionalMemoria = {};
                unidadeFuncionalMemoria["instrucao"] = null;            // armazana a instrucao que esta executando
                unidadeFuncionalMemoria["estadoInstrucao"] = null;      // salva todo o estado da instrucao
                unidadeFuncionalMemoria["tipoUnidade"] = tipoUnidade;   // define o tipo da unidade
                unidadeFuncionalMemoria["tempo"] = null;                // tempo que ainda falta pra instrucao acabar

                let nome = tipoUnidade + (i+1);                         //cria o nome da uf
                unidadeFuncionalMemoria["nome"] = nome;
                unidadeFuncionalMemoria["ocupado"] = false;             // define se a uf ta ocuapda ou nao
                unidadeFuncionalMemoria["qi"] = null;                   // uf que esta gerando o valor de vi
                unidadeFuncionalMemoria["qj"] = null;                   // uf que esta gerando o valor de vj (registrador de deslocamento)

                unidadeFuncionalMemoria["operacao"] = null;             // operacao que esta sendo executada
                unidadeFuncionalMemoria["endereco"] = null;             // endereco onde vai ser buscado
                unidadeFuncionalMemoria["destino"] = null;              // registrador de destino

                this.unidadesFuncionaisMemoria[nome] = unidadeFuncionalMemoria;
            }
        }

        this.clock = 0;       // define o clock atual

        this.estacaoRegistradores = {}
        // cria os registradores de ponto flutuante
        for(let i = 0; i < 32; i += 2) {
            this.estacaoRegistradores["F" + i] = null;
        }
        // cria os registradores de inteiro (necessarios para impedir erros com as operacoes de inteiro)
        for(let i = 0; i < 32; i += 1) {
            this.estacaoRegistradores["R" + i] = null;
        }
    }

    isSpeculating() {
        return this.branchSpeculation.active;
    }

    startBranchSpeculation(branchIndex, predictedTaken) {
        this.branchSpeculation.active = true;
        this.branchSpeculation.branchIndex = branchIndex;
        this.branchSpeculation.predictedTaken = predictedTaken;
        this.branchSpeculation.speculativeInstructions = [];
    }

    addSpeculativeInstruction(instrucaoIndex) {
        if (this.isSpeculating()) {
            this.branchSpeculation.speculativeInstructions.push(instrucaoIndex);
        }
    }

    flushSpeculation() {
        if (this.isSpeculating()) {
            for (let idx of this.branchSpeculation.speculativeInstructions) {
                // Remove issue/exeCompleta/write das instruções especulativas
                this.estadoInstrucoes[idx].issue = null;
                this.estadoInstrucoes[idx].exeCompleta = null;
                this.estadoInstrucoes[idx].write = null;
                this.estadoInstrucoes[idx].busy = false;
            }
            this.branchSpeculation.active = false;
            this.branchSpeculation.branchIndex = null;
            this.branchSpeculation.predictedTaken = false;
            this.branchSpeculation.speculativeInstructions = [];
        }
    }

    getNovaInstrucao() {
        // Se não está especulando, retorna a próxima instrução normal
        if (!this.isSpeculating()) {
            for (let i = 0; i < this.estadoInstrucoes.length; i++) {
                const element = this.estadoInstrucoes[i];
                if(element.issue == null)
                    return element;
            }
            return undefined;
        } else {
            // Se está especulando, só emite instruções após o desvio especulado
            let branchIdx = this.branchSpeculation.branchIndex;
            for (let i = branchIdx + 1; i < this.estadoInstrucoes.length; i++) {
                const element = this.estadoInstrucoes[i];
                if(element.issue == null) {
                    this.addSpeculativeInstruction(i);
                    return element;
                }
            }
            return undefined;
        }
    }

    issueNovaInstrucao() {
        let novaInstrucao = this.getNovaInstrucao();

        if (novaInstrucao) {
            let ufInstrucao = this.verificaUFInstrucao(novaInstrucao.instrucao);
            let UFParaUsar = this.getFUVazia(ufInstrucao);

            if (UFParaUsar) {
                // Se BEQ ou BNEZ, inicia especulação (sempre prevê "não desvia" para exemplo)
                if ((novaInstrucao.instrucao.operacao === 'BEQ' || novaInstrucao.instrucao.operacao === 'BNEZ') && !this.isSpeculating()) {
                    this.startBranchSpeculation(novaInstrucao.posicao, false); // false = prevê "não desvia"
                    novaInstrucao.especulativa = false; // o próprio desvio não é especulativo
                } else if (this.isSpeculating()) {
                    novaInstrucao.especulativa = true; // instruções após o desvio são especulativas
                    this.addSpeculativeInstruction(novaInstrucao.posicao);
                } else {
                    novaInstrucao.especulativa = false;
                }

                if ((UFParaUsar.tipoUnidade == 'Load') || (UFParaUsar.tipoUnidade == 'Store'))
                    this.alocaFuMem(UFParaUsar, novaInstrucao.instrucao, novaInstrucao);
                else
                    this.alocaFU(UFParaUsar, novaInstrucao.instrucao, novaInstrucao);

                novaInstrucao.issue = this.clock;

                if ((UFParaUsar.tipoUnidade !== 'Store') && (UFParaUsar.operacao !== 'BEQ') && (UFParaUsar.operacao !== 'BNEZ'))
                    this.escreveEstacaoRegistrador(novaInstrucao.instrucao, UFParaUsar.nome);
            }
        }
    }

    verificaUFInstrucao(instrucao) {
        // Funcao que verifica em qual unidade funcional cada instrucao deve executar
        switch (instrucao.operacao) {
            case 'ADDD':
                return 'Add'
            case 'SUBD':
                return 'Add'
            case 'MULTD':
                return 'Mult'
            case 'DIVD':
                return 'Mult'
            case 'LD':
                return 'Load'
            case 'SD':
                return 'Store'
            case 'ADD':
                return 'Integer'
            case 'DADDUI':
                return 'Integer'
            case 'BEQ':
                return 'Integer'
            case 'BNEZ':
                return 'Integer'
        }
    }

    getFUVazia(tipoFU) {
        // Funcao que busca a primeira UF vazia de um determinado tipo

        // caso a instrucao seja de load/store, busca nas unidades de memoria
        if ((tipoFU === 'Load') || (tipoFU === 'Store')) {
            // percorre todas as unidades de memoria
            for(let key in this.unidadesFuncionaisMemoria) {
                var ufMem = this.unidadesFuncionaisMemoria[key];

                // caso seja do tipo que esta buscando e esteja livre, retorna ela
                if (ufMem.tipoUnidade === tipoFU) {
                    if (!ufMem.ocupado) {
                        return ufMem;
                    }
                }
            }
            // caso nao encontre nenhuma, retorna undefined
            return undefined;
        }
        // percorre todas as unidades funcionais
        for(let key in this.unidadesFuncionais) {
            var uf = this.unidadesFuncionais[key];

            // caso seja do tipo que esta buscando e esteja livre, retorna ela
            if (uf.tipoUnidade === tipoFU) {
                if (!uf.ocupado) {
                    return uf;
                }
            }
        }
        // caso nao encontre nenhuma, retorna undefined
        return undefined;
    }

    getCiclos(instrucao) {
        // Funcao que busca na configuracao a quantidade de ciclos gastas em cada instrucao
        switch (instrucao.operacao) {
            case 'ADDD':
                return parseInt(this.configuracao.ciclos['Add']);
            case 'SUBD':
                return parseInt(this.configuracao.ciclos['Add']);
            case 'MULTD':
                return parseInt(this.configuracao.ciclos['Mult']);
            case 'DIVD':
                return parseInt(this.configuracao.ciclos['Div']);
            case 'LD':
                return parseInt(this.configuracao.ciclos['Load']);
            case 'SD':
                return parseInt(this.configuracao.ciclos['Store']);
            case 'ADD':
                return parseInt(this.configuracao.ciclos['Integer']);
            case 'DADDUI':
                return parseInt(this.configuracao.ciclos['Integer']);
            case 'BEQ':
                return parseInt(this.configuracao.ciclos['Integer']);
            case 'BNEZ':
                return parseInt(this.configuracao.ciclos['Integer']);
        }
    }

    alocaFuMem(uf, instrucao, estadoInstrucao) {
        // Funcao que aloca uma unidade funcional de memória para uma instrucao
        uf.instrucao = instrucao;
        uf.estadoInstrucao = estadoInstrucao;
        uf.tempo = this.getCiclos(instrucao) + 1; // salva o número de ciclos + 1 uma vez que quando estiver livre, nao execute um ciclo a menos (possivel execucao apos o issue)
        uf.ocupado = true;
        uf.operacao = instrucao.operacao;
        uf.endereco = instrucao.registradorS + '+' + instrucao.registradorT;
        uf.destino = instrucao.registradorR;
        uf.qi = null;
        uf.qj = null;

        // caso a instrucao seja de store, verifica se tem que esperar a uf escrever no registrador que vai salvar
        if (instrucao.operacao === 'SD') {
            // busca no banco de registradores qual o valor que esta escrito (VAL(UF)-execucao completa; UF-execucao pendente)
            let UFQueTemQueEsperar = this.estacaoRegistradores[instrucao.registradorR];

            // caso o nome seja de uma das unidades funcionais, marca que tem que esperar ela
            if ((UFQueTemQueEsperar in this.unidadesFuncionais) || (UFQueTemQueEsperar in this.unidadesFuncionaisMemoria))
                uf.qi = UFQueTemQueEsperar;
            else
                uf.qi = null;
        }

        // verifica se tem que esperar a uf de inteiros escrever o valor do registrador de deslocamento
        // busca no banco de registradores qual o valor que esta escrito (VAL(UF)-execucao completa; UF-execucao pendente)
        let UFintQueTemQueEsperar = this.estacaoRegistradores[instrucao.registradorT];

        // caso o nome seja de uma das unidades funcionais, marca que tem que esperar ela
        if ((UFintQueTemQueEsperar in this.unidadesFuncionais) || (UFintQueTemQueEsperar in this.unidadesFuncionaisMemoria))
            uf.qj = UFintQueTemQueEsperar;
        else
            uf.qj = null;
    }

    escreveEstacaoRegistrador(instrucao, ufNome) {
        // funcao que escreve no banco de registradores a uf que vai escrever naquele registrador
        this.estacaoRegistradores[instrucao.registradorR] = ufNome;
    }

    alocaFU(uf, instrucao, estadoInstrucao) {
        // funcao que aloca uma unidade funcional
        uf.instrucao = instrucao;
        uf.estadoInstrucao = estadoInstrucao;
        uf.tempo = this.getCiclos(instrucao) + 1; // é somado 1 pq vai ser subtraido 1 na fase de execucao apos isso
        uf.ocupado = true;
        uf.operacao = instrucao.operacao;

        let reg_j;
        let reg_k;
        let reg_j_inst;
        let reg_k_inst;

        // caso seja uma das instrucoes condicionais
        if ((instrucao.operacao === 'BNEZ') || (instrucao.operacao === 'BEQ')) {
            reg_j = this.estacaoRegistradores[instrucao.registradorR];   // busca o nome da uf q esta usando o registrador r
            reg_k = this.estacaoRegistradores[instrucao.registradorS];   // busca o nome da uf q esta usando o registrador s

            reg_j_inst = instrucao.registradorR;                         // salva o nome dos registradores que veio da instrucao
            reg_k_inst = instrucao.registradorS;
        } else {
            reg_j = this.estacaoRegistradores[instrucao.registradorS];   // busca o nome da uf q esta usando o registrador s
            reg_k = this.estacaoRegistradores[instrucao.registradorT];   // busca o nome da uf q esta usando o registrador t

            reg_j_inst = instrucao.registradorS;                         // salva o nome dos registradores que veio da instrucao
            reg_k_inst = instrucao.registradorT;
        }

        // se o registrador j e nulo (ninguem usou ele) ou nao definido (label), usa como valor o registrador que veio da instrucao
        if (reg_j === null || reg_j === undefined)
            uf.vj = reg_j_inst;
        else {
            // caso o nome seja uma unidade funcional, este registrador vai ter o valor escrito ainda, entao tem que esperar
            if ((reg_j in this.unidadesFuncionais) || (reg_j in this.unidadesFuncionaisMemoria))
                uf.qj = reg_j;
            else
                uf.vj = reg_j;
        }

        // se o registrador k e nulo (ninguem usou ele) ou nao definido (label), usa como valor o registrador que veio da instrucao
        if (reg_k === null || reg_k === undefined)
            uf.vk = reg_k_inst;
        else {
            // caso o nome seja uma unidade funcional, este registrador vai ter o valor escrito ainda, entao tem que esperar
            if ((reg_k in this.unidadesFuncionais) || (reg_k in this.unidadesFuncionaisMemoria))
                uf.qk = reg_k;
            else
                uf.vk = reg_k;
        }
    }


    liberaUFEsperandoResultado(UF) {
        // funcao que libera as uf que esta esperando essa terminar

        // percorre todas as unidades funcionais
        for(let keyUF in this.unidadesFuncionais) {
            const ufOlhando = this.unidadesFuncionais[keyUF];

            // se a unidade esta ocupada e o esta esperando esta uf em qj ou qk
            if ((ufOlhando.ocupado === true) &&
                ((ufOlhando.qj === UF.nome) ||
                    (ufOlhando.qk === UF.nome))) {

                // olha se esta esperando em qj, se estiver
                if (ufOlhando.qj === UF.nome) {
                    ufOlhando.vj = 'VAL(' + UF.nome + ')';   // escreve como vj o valor da uf
                    ufOlhando.qj = null;                     // retira a espera em qj
                }

                // olha se esta esperando em qk, se estiver
                if (ufOlhando.qk === UF.nome) {
                    ufOlhando.vk = 'VAL(' + UF.nome + ')';   // escreve como vj o valor da uf
                    ufOlhando.qk = null;                     // retira a espera em qj
                }

                // caso a unidade nao esteja mais esperando ninguem, retira o ciclo extra que foi adicionado
                if ((ufOlhando.qj === null) && (ufOlhando.qk === null)) {
                    ufOlhando.tempo = ufOlhando.tempo - 1; // subtrai 1 pq tira aquele valor q tava sobrando quando foi colocado
                }
            }
        }

        // percorre todas as unidades funcionais de memoria
        for(let keyUF in this.unidadesFuncionaisMemoria) {
            const ufOlhando = this.unidadesFuncionaisMemoria[keyUF];

            // se unidade estiver ocuapda
            if (ufOlhando.ocupado === true) {
                // caso esteja esperando a unidade, libera ela e subtrai o ciclo extra
                if (ufOlhando.qi === UF.nome) {
                    ufOlhando.qi = null;
                    ufOlhando.tempo = ufOlhando.tempo - 1;
                } else if (ufOlhando.qj === UF.nome) {
                    ufOlhando.qj = null;
                    ufOlhando.tempo = ufOlhando.tempo - 1;
                }
            }
        }
    }

    desalocaUFMem(ufMem) {
        // funcao que desaloca (limpa os campos) das unidades funcionais de memoria
        ufMem.instrucao = null;
        ufMem.estadoInstrucao = null;
        ufMem.tempo = null;
        ufMem.ocupado = false;
        ufMem.operacao = null;
        ufMem.endereco = null;
        ufMem.destino = null;
        ufMem.qi = null;
        ufMem.qj = null;
    }

    desalocaUF(uf) {
        // funcao que desaloca (limpa os campos) das unidades funcionais
        uf.instrucao = null;
        uf.estadoInstrucao = null;
        uf.tempo = null;
        uf.ocupado = false;
        uf.operacao = null;
        uf.vj = null;
        uf.vk = null;
        uf.qj = null;
        uf.qk = null;
    }

    verificaSeJaTerminou() {
        // funcao que verifica se todas as isntrucoes executaram
        // percorre todas as instrucoes e conta quntas ainda nao escreveram os resultados
        // se o numero for maior que 0, ainda tem instrucao pendente
        let qtdInstrucaoNaoTerminada = 0;
        for (let i = 0; i < this.estadoInstrucoes.length; i++) {
            const element = this.estadoInstrucoes[i];

            if (element.write === null)
                qtdInstrucaoNaoTerminada++;
        }

        return qtdInstrucaoNaoTerminada > 0 ? false : true;
    }


    executaInstrucao() {
        // funcao da fase de execucao do tomasulo

        // percorre todas as unidades funcionais da memoria
        for(let key in this.unidadesFuncionaisMemoria) {
            var ufMem = this.unidadesFuncionaisMemoria[key];

            // caso a unidade esteja ocupada e nao esteja esperando ninguem
            if ((ufMem.ocupado === true) && (ufMem.qi === null) && (ufMem.qj === null)) {
                ufMem.tempo = ufMem.tempo - 1;   // decrementa um ciclo para o termino da execucao
                console.log("estado Instrucao", ufMem.estadoInstrucao);

                // caso o tempo chegou a 0, escreve em qual ciclo a execucao terminou
                if (ufMem.tempo === 0) {
                    ufMem.estadoInstrucao.exeCompleta = this.clock;
                    ufMem.estadoInstrucao.busy = false; // Se tempo for 0, execução finaliza, então recebe false (Não está BUSY)
                }
            }
        }

        // percorre todas as unidades funcionais
        for(let key in this.unidadesFuncionais) {
            var uf = this.unidadesFuncionais[key];

            // caso a unidade esteja ocupada e nao esteja esperando ninguem
            if ((uf.ocupado === true) && (uf.vj !== null) && (uf.vk !== null)) {
                uf.tempo = uf.tempo - 1;   // decrementa um ciclo para o termino da execucao
                uf.estadoInstrucao.busy = true; // enquanto estiver executando, recebe true (Está BUSY)

                // caso o tempo chegou a 0, escreve em qual ciclo a execucao terminou
                if (uf.tempo === 0) {
                    uf.estadoInstrucao.exeCompleta = this.clock;
                    uf.estadoInstrucao.busy = false; // Se tempo for 0, execução finaliza, então recebe false (Não está BUSY)
    
                }
            }
        }
    }

    escreveInstrucao() {
        // fase de escrita do tomasulo

        // percorre todas as unidades funcionais de memoria
        for(let key in this.unidadesFuncionaisMemoria) {
            const ufMem = this.unidadesFuncionaisMemoria[key];

            // caso a unidade esteja ocupada e o tempo for -1
            if (ufMem.ocupado === true) {
                if (ufMem.tempo === -1) {
                    ufMem.estadoInstrucao.write = this.clock;   //escreve em qual ciclo escreveu no registrador

                    // verifica qual é o nome que esta na estacao de registradores
                    let valorReg = this.estacaoRegistradores[ufMem.instrucao.registradorR];

                    // se nenhuma outra uf vai escrever sobre o registrador, escreve nele
                    if (valorReg === ufMem.nome) {
                        this.estacaoRegistradores[ufMem.instrucao.registradorR] = 'VAL(' + ufMem.nome + ')';
                    }

                    // libera as ufs que esta esperando essa terminar e desaloca essa uf
                    this.liberaUFEsperandoResultado(ufMem);
                    this.desalocaUFMem(ufMem);
                }
            }
        }

        // percorre todas as unidades funcionais
        for(let key in this.unidadesFuncionais) {
            const uf = this.unidadesFuncionais[key];

            if (uf.ocupado === true) {
                if (uf.tempo === -1) {
                    uf.estadoInstrucao.write = this.clock;

                    let valorReg = this.estacaoRegistradores[uf.instrucao.registradorR];
                    if (valorReg === uf.nome) {
                        this.estacaoRegistradores[uf.instrucao.registradorR] = 'VAL(' + uf.nome + ')';
                    }

                    // Se BEQ/BNEZ, resolve especulação
                    if ((uf.operacao === 'BEQ' || uf.operacao === 'BNEZ') && this.isSpeculating()) {
                        let realTaken = true; // Sempre desvia

                        // Salva no histórico ANTES de limpar o branchSpeculation
                        this.branchSpeculationHistory.push({
                            branchIndex: this.branchSpeculation.branchIndex,
                            predictedTaken: this.branchSpeculation.predictedTaken,
                            speculativeInstructions: [...this.branchSpeculation.speculativeInstructions],
                            status: (realTaken !== this.branchSpeculation.predictedTaken) ? "Falha (flush realizado)" : "Correta"
                        });

                        if (realTaken !== this.branchSpeculation.predictedTaken) {
                            this.flushSpeculation();
                            this.branchSpeculation.status = "Falha (flush realizado)";
                        } else {
                            this.branchSpeculation.status = "Correta";
                            this.branchSpeculation.active = false;
                            this.branchSpeculation.branchIndex = null;
                            this.branchSpeculation.predictedTaken = false;
                            this.branchSpeculation.speculativeInstructions = [];
                        }
                    }

                    this.liberaUFEsperandoResultado(uf);
                    this.desalocaUF(uf);
                }
            }
        }
    }

    executa_ciclo() {
        // funcao de execucao do tomasulo

        this.clock++;  // adiciona 1 no clock

        // executa as instrucoes de issue, execucao e escrita do tomasulo
        this.issueNovaInstrucao();
        this.executaInstrucao();
        this.escreveInstrucao();

        // prints no console para debug
        console.log('Estado instrução:');
        console.log(JSON.stringify(this.estadoInstrucoes, null, 2));

        console.log('\nUnidades Funcionais memória:');
        console.log(JSON.stringify(this.unidadesFuncionaisMemoria, null, 2));

        console.log('\nUnidades Funcionais:');
        console.log(JSON.stringify(this.unidadesFuncionais, null, 2));

        console.log('Estado registradores:');
        console.log(JSON.stringify(this.estacaoRegistradores, null, 2));

        // retorna se a execucao de todas as instrucoes acabou ou nao
        return this.verificaSeJaTerminou();
    }

}


// funcao principal



function getConfig() {
    var conf = {};

    conf["nInst"] = $("#nInst").val();
    if(conf["nInst"] < 1) {
        alert("O número de instruções deve ser no mínimo 1!");
        return null;
    }

    var ciclos = {}

    ciclos["Integer"] = $("#ciclosInt").val();
    ciclos["Add"] = $("#ciclosInt").val();
    ciclos["Mult"] = $("#ciclosFPMult").val();
    ciclos["Div"] = $("#ciclosFPDiv").val();
    ciclos["Load"] = $("#ciclosLoad").val();
    ciclos["Store"] = $("#ciclosStore").val();


    if ((ciclos["Integer"] < 1) || (ciclos["Add"] < 1) || (ciclos["Div"] < 1) ||
        (ciclos["Mult"] < 1) || (ciclos["Load"] < 1)  || (ciclos["Store"] < 1)) {
        alert("A quantidade de ciclos por instrução, para todas as unidades, deve ser de no mínimo 1 ciclo!");
        return null;
    }

    conf["ciclos"] = ciclos

    var unidades = {}
    unidades["Integer"] = $("#fuInt").val();
    unidades["Add"] = $("#fuFPAdd").val();
    unidades["Mult"] = $("#fuFPMul").val();

    if ((unidades["Integer"] < 1) || (unidades["Add"] < 1) ||
        (unidades["Mult"] < 1)) {
        alert("A quantidade de unidades funcionais deve ser no mínimo 1!");
        return;
    }

    var unidadesMem = {}
    unidadesMem["Load"] = $("#fuLoad").val();
    unidadesMem["Store"] = $("#fuStore").val();


    if(unidades["Load"] < 1 || unidadesMem["Store"] < 1) {
        alert("A quantidade de unidades funcionais de memória deve ser no mínimo 1!");
        return;
    }


    conf["unidades"] = unidades;
    conf["unidadesMem"] = unidadesMem;
    return conf;
}

function getInst(i) {
    var inst = {};
    inst["indice"] = i;
    inst["d"] = $(`#D${i}`).val();
    inst["r"] = $(`#R${i}`).val();
    inst["s"] = $(`#S${i}`).val();
    inst["t"] = $(`#T${i}`).val();

    return inst;
}

//Alerta padrão para entradas inválidas das instruções
function alertValidaInstrucao(instrucao) {
    let saida = "A instrução \n";
    saida += instrucao["d"] + " " + instrucao["r"] + ", ";
    saida += instrucao["s"] + ", " + instrucao["t"];
    saida += " não atende os paramêtros do comando " + instrucao["d"];
    alert(saida);
}

function numeroEhInteiro(numero) {
    var valor = parseInt(numero);
    if (valor != numero){
        return false;
    }
    return true;
}

function registradorInvalidoR(registrador) {
    return (registrador[0] != 'R' || registrador.replace("R", "") == "" || isNaN(registrador.replace("R", "")))
        || !(numeroEhInteiro(registrador.replace("R", "")));
}

function registradorInvalidoF(registrador) {
    return (registrador[0] != 'F' || registrador.replace("F", "") == "" ||
            registrador.replace("F", "") % 2 != 0 || registrador.replace("F", "") > 30) ||
        !numeroEhInteiro(registrador.replace("F", ""));
}

function validaInstrucao(instrucao) {
    console.log(instrucao);
    var unidade = getUnidadeInstrucao(instrucao["d"]);
    if(!unidade) {
        alert("O comando da instrução é inváilido");
        return false;
    }

    if(unidade == "Load" || unidade == "Store") {
        var comando = instrucao["d"]

        if(comando == "LD" || comando == "SD") {
            if(registradorInvalidoF(instrucao["r"]) || isNaN(parseInt(instrucao["s"])) || registradorInvalidoR(instrucao["t"])) {
                alertValidaInstrucao(instrucao);
                return false;
            }
            return true;
        }
    }

    if(unidade == "Integer") {
        var comando = instrucao["d"]

        if(comando == "BEQ") {
            if(registradorInvalidoR(instrucao["r"]) || registradorInvalidoR(instrucao["s"]) || (instrucao["t"].replace(" ", "") == "")) {
                alertValidaInstrucao(instrucao);
                return false;
            }
            return true;
        }
        if(comando == "BNEZ") {
            if(registradorInvalidoR(instrucao["r"]) || (instrucao["s"].replace(" ", "") == "") || (instrucao["t"].replace(" ", "") != "")) {
                alertValidaInstrucao(instrucao);
                return false;
            }
            return true;
        }
        if(comando == "ADD") {
            if(registradorInvalidoR(instrucao["r"]) || registradorInvalidoR(instrucao["s"]) || registradorInvalidoR(instrucao["t"])) {
                alertValidaInstrucao(instrucao);
                return false;
            }
            return true;
        }
        if(comando == "DADDUI") {
            if(registradorInvalidoR(instrucao["r"]) || registradorInvalidoR(instrucao["s"]) || isNaN(parseInt(instrucao["t"]))) {
                alertValidaInstrucao(instrucao);
                return false;
            }
        }
        return true;
    }

    if(registradorInvalidoF(instrucao["r"]) || registradorInvalidoF(instrucao["s"]) || registradorInvalidoF(instrucao["t"])) {
        alertValidaInstrucao(instrucao);
        return false;
    }
    return true;

}

function getAllInst(nInst) {
    var insts = []
    console.log(nInst);

    for (var i = 0; i < nInst; i++) {
        var instrucao = getInst(i);
        if(!validaInstrucao(instrucao)) {
            return null;
        }
        insts.push(instrucao);
    }

    return insts;
}

function getUnidadeInstrucao(instrucao) {
    switch (instrucao) {
        case "ADD":
            return "Integer";
        case "DADDUI":
            return "Integer";
        case "BEQ":
            return "Integer";
        case "BNEZ":
            return "Integer";
        case "SD":
            return 'Store';
        case "LD":
            return "Load";
        case "SUBD":
            return "Add";
        case "ADDD":
            return "Add";
        case "MULTD":
            return "Mult";
        case "DIVD":
            return "Mult";
        default:
            return null
    }
}

// -----------------------------------------------------------------------------

function atualizaTabelaEstadoInstrucaoHTML(tabelaInsts) {
    for(let i in tabelaInsts) {
        const inst = tabelaInsts[i];
        $(`#i${inst["posicao"]}_is`).text(inst["issue"] ? inst["issue"] : "");
        $(`#i${inst["posicao"]}_ec`).text(inst["exeCompleta"] ? inst["exeCompleta"] : "");
        $(`#i${inst["posicao"]}_wr`).text(inst["write"] ? inst["write"] : "");
    }
}

function atualizaTabelaBufferReordenamentoHTML(tabelaInsts) {
    for(let i in tabelaInsts) {
        const inst = tabelaInsts[i];
        let espec = inst.especulativa ? " (especulativa)" : "";
        $(`#${inst["posicao"]}_destiny`).text(inst["instrucao"].registradorR + espec);

        if (inst["issue"] != null) {            
            $(`#${inst["posicao"]}_estado`).text("Execute");
            $(`#${inst["posicao"]}_busy`).text("sim");
        }

        if (inst["exeCompleta"] != null) {            
            $(`#${inst["posicao"]}_estado`).text("Write Result");

            if ( inst["instrucao"].operacao == "SD" || inst["instrucao"].operacao == "LD" ) {

                $(`#${inst["posicao"]}_value`).text("Mem["+inst["instrucao"].registradorS+" + Regs[" + inst["instrucao"].registradorT + "]]");

            } else if ( inst["instrucao"].operacao == "ADDD" || inst["instrucao"].operacao == "ADD" || inst["instrucao"].operacao == "DADDUI" ) {

                $(`#${inst["posicao"]}_value`).text(inst["instrucao"].registradorS+" + " + inst["instrucao"].registradorT);

            } else if ( inst["instrucao"].operacao == "SUBD" ) {

                $(`#${inst["posicao"]}_value`).text(inst["instrucao"].registradorS+" - " + inst["instrucao"].registradorT);

            } else if ( inst["instrucao"].operacao == "MULTD" ) {

                $(`#${inst["posicao"]}_value`).text(inst["instrucao"].registradorS+" * " + inst["instrucao"].registradorT);

            } else if ( inst["instrucao"].operacao == "DIVD" ) {

                $(`#${inst["posicao"]}_value`).text(inst["instrucao"].registradorS+" / " + inst["instrucao"].registradorT);

            }
        }

        if (inst["write"] != null) {            
            $(`#${inst["posicao"]}_estado`).text("Commit");
            $(`#${inst["posicao"]}_busy`).text("não");
        }

        $(`#i${inst["posicao"]}_ec`).text(inst["exeCompleta"] ? inst["exeCompleta"] : "");
        $(`#i${inst["posicao"]}_wr`).text(inst["write"] ? inst["write"] : "");
    }
}

function atualizaTabelaEstadoUFHTML(ufs) {
    for(let i in ufs) {
        const uf = ufs[i];
        $(`#${uf["nome"]}_tempo`).text((uf["tempo"] !== null) ? uf["tempo"] : "");
        $(`#${uf["nome"]}_ocupado`).text((uf["ocupado"]) ? "sim" : "não");
        $(`#${uf["nome"]}_operacao`).text(uf["operacao"] ? uf["operacao"] : "");
        $(`#${uf["nome"]}_vj`).text(uf["vj"] ? uf["vj"] : "");
        $(`#${uf["nome"]}_vk`).text(uf["vk"] ? uf["vk"] : "");
        $(`#${uf["nome"]}_qj`).text(((uf["qj"]) && (uf["qj"] !== 1)) ? uf["qj"] : "");
        $(`#${uf["nome"]}_qk`).text(((uf["qk"]) && (uf["qk"] !== 1)) ? uf["qk"] : "");
    }
}

function atualizaTabelaEstadoMenHTML(men) {
    for (var reg in men) {
        $(`#${reg}`).html(men[reg] ? men[reg] : "&nbsp;");
    }
}

function atualizaClock(clock) {
    $("#clock").html("Ciclo: " + clock );

}

function atualizaStatusEspeculacao(diagrama) {
    let espec = diagrama.branchSpeculation;
    let status = "";
    if (espec.active) {
        status = `Especulação ativa: Previsto "${espec.predictedTaken ? "Desvia" : "Não desvia"}" no desvio I${espec.branchIndex}`;
    } else if (espec.status) {
        status = `Status da especulação: ${espec.status}`;
    } else {
        status = "Sem especulação ativa";
    }
    $("#statusEspeculacao").html(`<b>${status}</b>`);
}

function atualizaTabelaEstadoInstrucaoHTML(tabelaInsts) {
    for(let i in tabelaInsts) {
        const inst = tabelaInsts[i];
        let espec = inst.especulativa ? " (especulativa)" : "";
        $(`#i${inst["posicao"]}_is`).text((inst["issue"] ? inst["issue"] : "") + espec);
        $(`#i${inst["posicao"]}_ec`).text(inst["exeCompleta"] ? inst["exeCompleta"] : "");
        $(`#i${inst["posicao"]}_wr`).text(inst["write"] ? inst["write"] : "");
    }
}

// -----------------------------------------------------------------------------

function gerarTabelaEstadoInstrucaoHTML(diagrama) {
    var s = (
        "<h3>Status das instruções</h3><table class='table table-striped table-hover'>"
        + "<tr><th></th><th>Instrução</th><th>i</th><th>j</th>"
        + "<th>k</th><th>Issue</th><th>Exec. Completa</th><th>Write Result</th></tr>"
    );

    for (let i = 0 ; i < diagrama.configuracao["numInstrucoes"]; ++i) {
        let instrucao = diagrama.estadoInstrucoes[i].instrucao;
        s += (
            `<tr> <td>I${i}</td> <td>${instrucao["operacao"]}</td>
            <td>${instrucao["registradorR"]}</td> <td>${instrucao["registradorS"]}</td> <td>${instrucao["registradorT"]}</td>
            <td id='i${i}_is'></td></td> <td id='i${i}_ec'></td>
            <td id='i${i}_wr'></td> </tr>`
        );
    }

    s += "</table>";
    $("#estadoInst").html(s);
}

function gerarTabelaBufferReordenamento(diagrama) {
    var s = (
        "<h3>Buffer de Reordenamento</h3><table class='table table-striped table-hover'>"
        + "<tr><th>Entrada</th><th>Ocupado</th><th>Instrução</th>"
        + "<th>Estado</th><th>Destino</th><th>Valor</th></tr>"
    );
    for (let i = 0 ; i < diagrama.configuracao["numInstrucoes"]; ++i) {
        let instrucao = diagrama.estadoInstrucoes[i].instrucao;
        s += (
            `<tr><td>${i}</td>
           <td id="`+ i +`_busy">não</td> <td>${instrucao["operacao"]} ${instrucao["registradorR"]}, ${instrucao["registradorS"]}, ${instrucao["registradorT"]}</td> <td id="`+ i +`_estado">Issue</td>
           <td id="`+ i +`_destiny"></td> <td id="`+ i +`_value"></td>`
        );
    }
    s += "</table>";
    $("#bufferReord").html(s);
}

function gerarTabelaEstadoUFHTML(diagrama) {
    var s = (
        "<h3>Unidades Funcionais</h3><table class='table table-striped table-hover'><tr> <th>Tempo</th> <th>UF</th> <th>Ocupado</th>"
        + "<th>Op</th> <th>Vj</th> <th>Vk</th> <th>Qj</th> <th>Qk</th>"
    );

    console.log(diagrama.unidadesFuncionais);
    let unidadesFuncionais = diagrama.unidadesFuncionais;
    for(let key in unidadesFuncionais) {
        var uf = unidadesFuncionais[key];

        s += `<tr><td id="${uf["nome"]}_tempo"></td>
             <td>${uf["nome"]}</td> <td id="${uf["nome"]}_ocupado"></td>
             <td id="${uf["nome"]}_operacao"></td>
             <td id="${uf["nome"]}_vj"></td> <td id="${uf["nome"]}_vk"></td>
             <td id="${uf["nome"]}_qj"></td> <td id="${uf["nome"]}_qk"></td>
             `
    }

    s += "</table>"
    $("#estadoUF").html(s);
}

function gerarTabelaEstadoMenHTML(diagrama) {
    var s = `<h3>Estado dos registradores</h3> <table class="table table-striped table-hover">`;

    for(var i = 0; i < 2; ++i) {
        s += `<tr>`
        for(var j = 0; j < 16; j += 2) {
            s += `<th>F${j+i*16}</th>`
        }
        s += `</tr> <tr>`
        for(var j = 0; j < 16; j += 2) {
            s += `<td id="F${j+i*16}">&nbsp;</td>`
        }
        s += `</tr>`
    }

    s += "</table>"
    $("#estadoMem").html(s);
}

function gerarTabelaEstadoUFMem(diagrama) {
    var s = (
        "<h3>Unidades Funcionais Load/Store</h3><table class='table table-striped table-hover'>"
        + "<tr><th>Tempo</th><th>Instrução</th><th>Ocupado</th><th>Endereço</th>"
        + "<th>Destino</th>"
    );
    for(let key in diagrama.unidadesFuncionaisMemoria) {
        var ufMem = diagrama.unidadesFuncionaisMemoria[key];

        s += `<tr><td id="${ufMem["nome"]}_tempo"></td>
             <td>${ufMem["nome"]}</td> <td id="${ufMem["nome"]}_ocupado"></td>
             <td id="${ufMem["nome"]}_endereco"></td><td id="${ufMem["nome"]}_destino"></td>
             `
    }
    s += "</table>"
    $("#estadoMemUF").html(s);
}

function gerarTabelaEspeculacao(diagrama) {
    let espec = diagrama.branchSpeculation;
    let history = diagrama.branchSpeculationHistory || [];
    let s = `
        <h3>Status da Especulação de Desvio</h3>
        <table class="table table-striped table-hover">
            <tr>
                <th>Status</th>
                <th>Desvio (Instrução)</th>
                <th>Previsão</th>
                <th>Instruções Especulativas</th>
            </tr>
    `;

    // Mostra histórico de todas as decisões
    if (history.length > 0) {
        for (let h of history) {
            s += `
                <tr>
                    <td>${h.status}</td>
                    <td>${h.branchIndex !== null ? "I" + h.branchIndex : "-"}</td>
                    <td>${h.predictedTaken ? "Desvia" : "Não desvia"}</td>
                    <td>${
                        h.speculativeInstructions && h.speculativeInstructions.length > 0
                            ? h.speculativeInstructions.map(i => "I" + i).join(", ")
                            : "-"
                    }</td>
                </tr>
            `;
        }
    } else {
        // Se não há histórico, mostra linha padrão
        s += `
            <tr>
                <td>Inativa</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
            </tr>
        `;
    }

    // Mostra a especulação ativa, se houver
    if (espec.active) {
        s += `
            <tr>
                <td>Ativa</td>
                <td>${espec.branchIndex !== null ? "I" + espec.branchIndex : "-"}</td>
                <td>${espec.predictedTaken ? "Desvia" : "Não desvia"}</td>
                <td>${
                    espec.speculativeInstructions && espec.speculativeInstructions.length > 0
                        ? espec.speculativeInstructions.map(i => "I" + i).join(", ")
                        : "-"
                }</td>
            </tr>
        `;
    }

    s += "</table>";
    $("#tabelaEspeculacao").html(s);
}

function atualizaTabelaEstadoUFMemHTML(ufsMem) {
    for(let key in ufsMem) {
        const ufMem = ufsMem[key];
        console.log('QQQQ', ufMem);
        $(`#${ufMem["nome"]}_tempo`).text((ufMem["tempo"] !== null) ? ufMem["tempo"] : "");
        $(`#${ufMem["nome"]}_ocupado`).text((ufMem["ocupado"]) ? "sim" : "não");
        $(`#${ufMem["nome"]}_operacao`).text(ufMem["operacao"] ? ufMem["operacao"] : "");
        $(`#${ufMem["nome"]}_endereco`).text(ufMem["endereco"] ? ufMem["endereco"] : "");
        $(`#${ufMem["nome"]}_destino`).text(ufMem["destino"] ? ufMem["destino"] : "");
    }
}

function geraTabelaParaInserirInstrucoes(nInst) {
    var tabela = "<table id='tabelaInst' class='table table-striped table-hover'>"
    for(var i = 0; i < nInst; i++) {
        var d = "D" + i;
        var r = "R" + i;
        var s = "S" + i;
        var t = "T" + i;
        tabela += (
            "<tr>" +
            "<td>" +
            "<select class='form-control' size=\"1\" name=\"" + d + "\" id=\"" + d + "\">" +
            "<option selected value = \"\">Instrução</option>" +
            "<option value=\"LD\">LD</option>" +
            "<option value=\"SD\">SD</option>" +
            "<option value=\"MULTD\">MULTD</option>" +
            "<option value=\"DIVD\">DIVD</option>" +
            "<option value=\"ADDD\">ADDD</option>" +
            "<option value=\"SUBD\">SUBD</option>" +
            "<option value=\"ADD\">ADD</option>" +
            "<option value=\"DADDUI\">DADDUI</option>" +
            "<option value=\"BEQ\">BEQ</option>" +
            "<option value=\"BNEZ\">BNEZ</option>" +
            "</td>" +
            "<td><input class='form-control' type=\"text\" name=\""+ r + "\" id=\""+ r + "\" size=\"3\" maxlength=\"3\" /></td>" +
            "<td><input class='form-control' type=\"text\" name=\""+ s + "\" id=\""+ s + "\" size=\"3\" maxlength=\"5\" /></td>" +
            "<td><input class='form-control' type=\"text\" name=\""+ t + "\" id=\""+ t + "\" size=\"3\" maxlength=\"3\" /></td>" +
            "</tr>"
        );
    }
    tabela += "</table>";
    $("#listaInstrucoes").html(tabela);
}

// -----------------------------------------------------------------------------

function carregaExemplo(exN = false) {
    if(!exN) {
        exN = $("#exemploSelect").val();
        confirmou = true;
    }
    confirmou = true;
    $.getJSON(`./presets/ex${exN}.json`, function() {
        console.log("Lido :3");

    }).fail(function() {
        alert("Não foi possivel carregar o exemplo.")
    }).done(function(data) {
        $("#nInst").val(data["insts"].length);
        var confirmou = confirmarNInst();

        for (var i = 0; i < data["insts"].length; i++) {
            $(`#D${i}`).val(data["insts"][i]["D"]);
            $(`#R${i}`).val(data["insts"][i]["R"]);
            $(`#S${i}`).val(data["insts"][i]["S"]);
            $(`#T${i}`).val(data["insts"][i]["T"]);
        }

        for (var key in data["config"]["ciclos"]) {
            $(`#${key}`).val(parseInt(data["config"]["ciclos"][key]));
        }

        for (var key in data["config"]["unidades"]) {
            $(`#${key}`).val(parseInt(data["config"]["unidades"][key]));
        }


    });
}


function confirmarNInst() {
    var nInst = $("#nInst").val();
    if(nInst < 1) {
        alert("O número de instruções deve ser no mínimo 1");
        return false;
    }
    geraTabelaParaInserirInstrucoes(nInst);
    return true;
}


function limparCampos() {
    $("#exemploSelect").val("---");

    $("#nInst").val(1);
    $("#listaInstrucoes").html("");

    $("#ciclosInt").val(1);
    $("#ciclosFPAdd").val(1);
    $("#ciclosFPMul").val(1);
    $("#ciclosFPDiv").val(1);

    $("#fuStore").val(1);
    $("#fuLoad").val(1);
    $("#fuInt").val(1);
    $("#fuFPAdd").val(1);
    $("#fuFPMul").val(1);

    $("#clock").html("");
    $("#estadoInst").html("");
    $("#estadoMemUF").html("");getAllInst();
    $("#estadoUF").html("");
    $("#estadoMem").html("");
}

 function enviar(){
     if(!confirmou) {
         alert("Confirme o número de instruções!");
         return;
     }

     console.log("aqui");
     verificaNInst();

     const CONFIG = getConfig();
     if(!CONFIG) {
         return;
     }
     var insts = getAllInst(CONFIG["nInst"]);
     if(!insts) {
         return;
     }
     diagrama = new Estado(CONFIG, insts);
     gerarTabelaEstadoInstrucaoHTML(diagrama);
     gerarTabelaBufferReordenamento(diagrama);
     atualizaTabelaEstadoInstrucaoHTML(diagrama["tabela"])
     gerarTabelaEstadoUFHTML(diagrama);
     console.log('diagrama UF porra', diagrama["unidadesFuncionais"]);
     atualizaTabelaEstadoUFHTML(diagrama["unidadesFuncionais"]);
     gerarTabelaEstadoMenHTML(diagrama);
     gerarTabelaEstadoUFMem(diagrama);
     atualizaTabelaEstadoUFMemHTML(diagrama["ufMem"]);
     atualizaTabelaBufferReordenamentoHTML(diagrama["ufMem"]);
     terminou = false;
     $("#clock").html("Clock: 0");
     $('#configuracoesview').hide('slow');
     $('#simuladorview').show('slow');
 }

function verificaNInst() {
    var tds = $("#tabelaInst").children('tbody').children('tr').length;
    $("#nInst").val(tds);
}


function proximoFunctionN() {
    if(!diagrama) return;
    if(terminou) {
        alert("Todas as instruções estão completadas.");
        return;
    }
    terminou = diagrama.executa_ciclo();
    atualizaTabelaEstadoInstrucaoHTML(diagrama.estadoInstrucoes);
    atualizaTabelaBufferReordenamentoHTML(diagrama.estadoInstrucoes);
    atualizaTabelaEstadoUFMemHTML(diagrama.unidadesFuncionaisMemoria);
    atualizaTabelaEstadoUFHTML(diagrama.unidadesFuncionais);
    atualizaTabelaEstadoMenHTML(diagrama.estacaoRegistradores);
    atualizaClock(diagrama.clock);
    atualizaStatusEspeculacao(diagrama);
    gerarTabelaEspeculacao(diagrama);
}

function resultadobtn() {
    if(!diagrama) return;
    while(!terminou) {
        terminou = diagrama.executa_ciclo();
        atualizaTabelaEstadoInstrucaoHTML(diagrama.estadoInstrucoes);
        atualizaTabelaBufferReordenamentoHTML(diagrama.estadoInstrucoes);
        atualizaTabelaEstadoUFMemHTML(diagrama.unidadesFuncionaisMemoria);
        atualizaTabelaEstadoUFHTML(diagrama.unidadesFuncionais);
        atualizaTabelaEstadoMenHTML(diagrama.estacaoRegistradores);
        atualizaClock(diagrama.clock);
        atualizaStatusEspeculacao(diagrama);
        gerarTabelaEspeculacao(diagrama); 
    }
}

var confirmou = false;
var diagrama = null;
var terminou = false;
$(document).ready(function() {


    $("#limpar").click(function() {
        limparCampos();
    })

    $("#carregaExemplo").click(function() {
        carregaExemplo();
        confirmou = true;
    });

    $("#confirmarNInst").click(function() {
        confirmou = confirmarNInst();
    });

    // $("#enviar").click(enviar());

    $("#proximo").click(proximoFunctionN);
    $("#resultado").click(resultadobtn);
});