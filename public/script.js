// Evento de envio do formulário
document.getElementById('timeForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Obter valores do formulário
    var nomeMed = document.getElementById('nomeMed').value;
    var horaTomou = document.getElementById('horaTomou').value;
    var horaTomara = document.getElementById('horaTomara').value;
    var fazUso_qtd = document.getElementById('fazUso_qtd').value;

    // Enviar os dados para o servidor
    fetch('/adicionarmedicamentos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nomeMed: nomeMed, horaTomou: horaTomou, horaTomara: horaTomara, fazUso_qtd: fazUso_qtd }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Dados salvos:', data);
        // Exibir feedback para o usuário
        var feedback = document.getElementById('feedback');
        feedback.style.display = 'block';
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000); // Esconder o feedback após 3 segundos
    })
    .catch((error) => {
        console.error('Erro ao salvar dados:', error);
    });
});

// Função para abrir o modal
function openModal() {
    var modal = document.getElementById("myModal");
    modal.style.display = "block";
}

// Fecha o modal quando o usuário clica no botão de fechar
var span = document.getElementsByClassName("close")[0];
if (span) {
    span.onclick = function() {
        var modal = document.getElementById("myModal");
        modal.style.display = "none";
    }
}

// Função para calcular o próximo horário e abrir o modal se estiver na hora
function verificarProximoHorario() {
    fetch('/gethoraTomou')
    .then(response => response.json())
    .then(data => {
        var currenthoraTomou = new Date();
        var modalTime = new Date(data.horaTomou);

        var horaTomaraMs = data.horaTomara * 60 * 60 * 1000;

        // Calcula o próximo horário
        modalTime.setTime(modalTime.getTime() + horaTomaraMs);

        // Verifica se está na hora de abrir o modal (com uma margem de 10 segundos)
        if (Math.abs(currenthoraTomou - modalTime) < 10000) {
            openModal();
        }
    })
    .catch((error) => {
        console.error('Erro ao obter horário:', error);
    });
}

// Verificação periódica para abrir o modal se estiver na hora correta
setInterval(verificarProximoHorario, 10000); // Verifica a cada 10 segundos

// Evento para fechar o modal quando o usuário clica fora da área do modal
window.onclick = function(event) {
    var modal = document.getElementById("myModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
