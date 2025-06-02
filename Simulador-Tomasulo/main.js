$(document).ready(function () {
    viewInit();
});


function viewInit() {
    include('/ui/menu.html', 'menu-top-ui');
    include('/view/configuracoes.html', 'configuracoesview');
    include('/view/simulador.html', 'simuladorview');
}

//gera numeros aleatorios
function getRandomInt() {
    return Math.floor(Math.random() * (999999)) + 100;
}

function include(file, elementIdToSetContent) {
    fetch(file+'?'+getRandomInt())
        .then((result) => {
            return result.text();
        })
        .then((content) => {
            document.getElementById(elementIdToSetContent).innerHTML = content;
        });
}