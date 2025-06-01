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

function screenshot(elm) {
    $(elm).html('<i class="fas fa-sync fa-spin"></i> Capturando...');
    html2canvas(document.getElementById("mainprintscreen")).then(canvas => {
        var img = canvas.toDataURL("image/png");
        var dlLink = document.createElement('a');
        dlLink.download = "screenshot.png";
        dlLink.href = img;
        dlLink.dataset.downloadurl = ["image/png", dlLink.download, dlLink.href].join(':');
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
        $(elm).addClass('btn-success').removeClass('btn-primary').removeClass('pulse-button').html('<i class="fas fa-check"></i> Sucesso!');
        setTimeout(function (){
            $(elm).removeClass('btn-success').addClass('btn-primary').addClass('pulse-button').html('<i class="fas fa-camera"></i> Capturar');
        }, 2000);
    });
}