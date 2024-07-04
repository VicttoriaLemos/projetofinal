const mysql = require('mysql2');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

const session = require('express-session');

app.use(session({
    secret: 'sua_chave_secreta_aqui',
    resave: false,
    saveUninitialized: false
}));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'medicamentos'
});

connection.connect(function (err) {
    if (err) {
        console.error('Erro: ', err);
        return;
    }
    console.log("Conexão estabelecida com sucesso!");

    // Iniciar a verificação e atualização dos horários a cada hora
    verificarAtualizarHorarios();
});

// Função para calcular os próximos 5 horários
function calcularProximosHorarios(horaTomou, horaTomara) {
    const horarios = [];
    const ultimoHorario = new Date(`1970-01-01T${horaTomou}:00`);

    for (let i = 0; i < 5; i++) {
        ultimoHorario.setHours(ultimoHorario.getHours() + parseInt(horaTomara)); // Adiciona o intervalo de horas

        // Formata a hora e minutos como strings com dois dígitos
        const horas = ultimoHorario.getHours().toString().padStart(2, '0');
        const minutos = ultimoHorario.getMinutes().toString().padStart(2, '0');

        // Constrói o formato HH:MM
        const horarioFormatado = `${horas}:${minutos}`;
        horarios.push(horarioFormatado);
    }

    return horarios;
}


// Função para verificar e atualizar os próximos horários a cada hora
function verificarAtualizarHorarios() {
    setInterval(() => {
        connection.query("SELECT horaTomou, horaTomara FROM remedio", (err, rows) => {
            if (err) {
                console.error('Erro ao consultar horários:', err);
                return;
            }

            rows.forEach(row => {
                const { horaTomou, horaTomara } = row;
                const proximosHorarios = calcularProximosHorarios(horaTomou, horaTomara);

                console.log(`Próximos 5 horários para tomar o medicamento: ${row.nomeMed}`);
                proximosHorarios.forEach((horario, index) => {
                    console.log(`Horário ${index + 1}: ${horario}`);
                });
            });
        });
    }, 3600000); // Executa a cada 1 hora (3600000 milissegundos)
}

// Iniciar a função de verificação e atualização de horários
verificarAtualizarHorarios();

/* Rota principal */
app.get("/", function (req, res) {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lembrete de Medicamentos</title>
            <link rel="icon" type="image/x-icon" href="icon.png">
            <link rel="stylesheet" type="text/css" href="/estilo.css">
            <script src="index.js" defer></script>
        </head>
        <body class="telaInicio">
            <header class="app__telaInicio" >
                <h1 class="titulo">Lembretes de medicamentos e para renovações de receitas médicas.</h1>
            </header>
            <div class="botoes"> 
                <a href="http://localhost:8081/login" class="btn"> Entrar</a>
                <a href="http://localhost:8081/criarconta" class="btn">Criar Conta</a>
            </div>
            <div class="imagem"></div>
        </body>
        </html>
    `);
});

// Rota para servir o arquivo HTML de medicamentos
app.get("/medicamentos", function (req, res) {
    res.sendFile(path.join(__dirname, "public", "medicamentos.html"));
});


/* Endpoint para adicionar medicamentos */
app.post('/adicionarmedicamentos', (req, res) => {
    const { nomeMed, horaTomou, horaTomara, fazUso_qtd } = req.body;

    const insert = "INSERT INTO remedio (nomeMed, horaTomou, horaTomara, fazUso_qtd) VALUES (?, ?, ?, ?)";
    const values = [nomeMed, horaTomou, horaTomara, fazUso_qtd];

    connection.query(insert, values, function (err, result) {
        if (err) {
            console.error('Erro ao adicionar medicamento:', err);
            return res.status(500).send('Erro ao adicionar medicamento');
        }

        console.log(`Medicamento adicionado - Último Horário que tomou: ${horaTomou}, Deve tomar a cada: ${horaTomara} horas`);

        const proximoHorarios = calcularProximosHorarios(horaTomou, horaTomara);
        console.log(`Próximos 5 horários para tomar o medicamento ${nomeMed}:`);
        proximoHorarios.forEach((horario, index) => {
            console.log(`Horário ${index + 1}: ${horario}`);
        });

        res.send({ message: 'Horário e intervalo salvos com sucesso' });
    });
});

/* Endpoint para obter o horário e intervalo */
app.get('/gethoraTomou', (req, res) => {
    connection.query("SELECT horaTomou, horaTomara FROM remedio", (err, rows) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.send(rows);
    });
});

/* Rota para listar os dados do BD */
app.get("/listarmedicamentos", function (req, res) {
    const selectAll = "SELECT * FROM remedio";

    connection.query(selectAll, function (err, rows) {
        if (!err) {
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Lembrete de Medicamentos</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="/index.js" defer></script>
                    <script src="script.js" defer></script>
                </head>
                <body>
                    <header>
                        <h1>Lembrete de Medicamentos</h1>
                    </header>
                    <article class="table-responsive">
                        <table class="table table.bg-primary">
                            <tr>
                                <th class="table-primary">Medicamento</th>
                                <th class="table-primary">Hora do último</th>
                                <th class="table-primary">Intervalo de...horas</th>
                                <th class="table-primary">Quantidade</th>
                                <th class="table-primary">Editar</th>
                                <th class="table-primary">Deletar</th>
                            </tr>
                            ${rows.map(row => `
                                <tr>
                                    <td>${row.nomeMed}</td>
                                    <td>${formatarHora(row.horaTomou)}</td>
                                    <td>${row.horaTomara}</td>
                                    <td>${row.fazUso_qtd}</td>
                                    <td><a href="/atualizar-medicamento-form/${row.id_medicamento}">Editar</a></td>
                                    <td><a href="/deletar-medicamento/${row.id_medicamento}">Deletar</a></td>
                                </tr>
                            `).join('')}
                        </table>
                    </article>
                    <footer>
                        <a href="http://localhost:8081">Voltar</a>
                    </footer>
                    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
                </body>
                </html>
            `);
        } else {
            console.log("Erro ao consultar medicamentos!", err);
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erro!</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body class="telaInicio">
   
                    <div class="imagem_fundo"></div>
                     <footer id="footer">
                        <a href="http://localhost:8081">Voltar</a>
                    </footer>
                </body>
                </html>
            `);
        }
    });
});

/* Rota para deletar um medicamento */
app.get("/deletar-medicamento/:id_medicamento", function (req, res) {
    const id_medicamento = req.params.id_medicamento;
    const deleteremedio = "DELETE FROM remedio WHERE id_medicamento = ?";

    connection.query(deleteremedio, [id_medicamento], function (err, result) {
        if (!err) {
            console.log("Medicamento deletado!");
            res.redirect('/listarmedicamentos');
        } else {
            console.log("Erro ao deletar medicamento!", err);
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erro!</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body class="telaInicio">
   
                    <div class="imagem_fundo"></div>
                     <footer id="footer">
        <a href="http://localhost:8081">Voltar</a>
    </footer>
                </body>
                </html>
            `);
        }
    });
});

/* Rota para exibir o formulário de atualização */
app.get("/atualizar-medicamento-form/:id_medicamento", function (req, res) {
    const id_medicamento = req.params.id_medicamento;
    const selectremedio = "SELECT * FROM remedio WHERE id_medicamento = ?";

    connection.query(selectremedio, [id_medicamento], function (err, rows) {
        if (!err && rows.length > 0) {
            const remedio = rows[0];
            res.send(`
             <!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atualizar Lembrete de Medicamentos</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kufam:ital,wght@0,400..900;1,400..900&display=swap"
        rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="icon" type="image/x-icon" href="icon.png">
    <link rel="stylesheet" type="text/css" href="/estilo.css">
    <script src="/index.js" defer></script>
    <script src="script.js" defer></script>
</head>

<body>
    <header>
        <h1>Atualizar </h1>
    </header>

    <article>
                    <form class="cadastro" id="timeForm" action="/atualizar-medicamento/${remedio.id_medicamento}" method="POST">
                     <div class="field inputbox">
                        <label for="nomeMed"></label>
                        <input type="text" id="nomeMed" name="nomeMed" value="${remedio.nomeMed}" required><br><br>
                        <span>Nome do medicamento:</span>
                    </div>

                    <div>
                        <label for="horaTomou">Que horas você tomou sua última medicação?(HH:MM):</label>
                        <input type="time" id="horaTomou" name="horaTomou" class="custom-time-input" value="${remedio.horaTomou}" required>
                    </div>

                    <div>
                        <label for="horaTomara">A cada quantas horas deve tomar novamente?</label>
                    <select name="horaTomara" id="horaTomara" value="${remedio.horaTomou}" required>
                        <option value="">Selecione</option>
                        <option value="4">4hs</option>
                        <option value="6">6hs</option>
                        <option value="8">8hs</option>
                        <option value="12">12h</option>
                    </select>
                    </div>

                    <div class="field inputbox">
                        <label for="fazUso_qtd">Quantidade de medicamentos que toma por vez:</label>
                        <input type="number" min="0" id="fazUso_qtd" name="fazUso_qtd" value="${remedio.fazUso_qtd}" required>
                    </div>



                      <input type="submit" value="Atualizar">
        </form>

    </article>

    <div id="feedback" style="display: none;">Horário salvo com sucesso!</div>

    <!-- Modal -->
    <div id="myModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <p>Está na hora de você tomar seu medicamento!</p>
        </div>
    </div>

    <footer>
        <a href="http://localhost:8081">Voltar</a>
    </footer>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
        crossorigin="anonymous"></script>
</body>

</html>
            `);
        } else {
            console.log("Erro ao buscar medicamento!", err);
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erro!</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body class="telaInicio">
   
                    <div class="imagem_fundo"></div>
                </body>
                </html>
            `);
        }
    });
});

/* Endpoint para atualizar um medicamento */
app.post("/atualizar-medicamento/:id_medicamento", function (req, res) {
    const id_medicamento = req.params.id_medicamento;
    const { nomeMed, horaTomou, horaTomara, fazUso_qtd } = req.body;

    const updateremedio = "UPDATE remedio SET nomeMed=?, horaTomou=?, horaTomara=?, fazUso_qtd=? WHERE id_medicamento=?";

    connection.query(updateremedio, [nomeMed, horaTomou, horaTomara, fazUso_qtd, id_medicamento], function (err, result) {
        if (!err) {
            console.log("Medicamento atualizado!");
            res.redirect('/listarmedicamentos');
        } else {
            console.log("Erro ao atualizar medicamento!", err);
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erro!</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body class="telaInicio">
   
                    <div class="imagem_fundo"></div>
                    <footer id="footer">
                        <a href="http://localhost:8081">Voltar</a>
                    </footer>
                </body>
                </html>
            `);
        }
    });
});

/*-------------------Final crud medicamentos-------------------*/

// Rota para servir o formulário de cadastro de estoque
app.get("/estoqueremedio", function (req, res) {
    res.sendFile(__dirname + "/estoqueremedio.html");
});

// Função para calcular a data do próximo pedido
function calcularDataPedido(intervalo, qtdPossui, toma_quantos, qtdMin, ultTomado) {
    const dosesPorDia = (24 / intervalo) * toma_quantos;
    const diasRestantes = (qtdPossui - qtdMin) / dosesPorDia;
    const ultimaTomada = new Date(ultTomado);

    ultimaTomada.setDate(ultimaTomada.getDate() + diasRestantes);

    // Formatando a data para o formato "DD/MM/YYYY"
    const formattedNextRequestDate = `${ultimaTomada.getDate().toString().padStart(2, '0')}/${(ultimaTomada.getMonth() + 1).toString().padStart(2, '0')}/${ultimaTomada.getFullYear()}`;

    return formattedNextRequestDate;
}

// Endpoint para adicionar medicamentos ao estoque
app.post('/adicionarEstoque', (req, res) => {
    const { nomereme, ultTomado, intervalo, toma_quantos, qtdPossui, qtdMin } = req.body;

    // Convertendo ultTomado em um objeto Date
    const [hh, mm] = ultTomado.split(':');
    const lastTaken = new Date();
    lastTaken.setHours(hh);
    lastTaken.setMinutes(mm);

    // Convertendo intervalo para número inteiro
    const interval = parseInt(intervalo);

    // Calculando a próxima data para pedir uma nova receita
    const currentDate = new Date();
    const daysToAdd = Math.ceil(qtdPossui / (toma_quantos * interval)); // Quantidade de dias até que a quantidade mínima seja atingida
    const nextRequestDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000); // Adicionando dias em milissegundos

    // Formatando a data do próximo pedido para "YYYY-MM-DD"
    const formattedNextRequestDate = `${nextRequestDate.getFullYear()}-${(nextRequestDate.getMonth() + 1).toString().padStart(2, '0')}-${nextRequestDate.getDate().toString().padStart(2, '0')}`;

    // Inserir no banco de dados
    const values = [nomereme, ultTomado, intervalo, toma_quantos, qtdPossui, qtdMin, formattedNextRequestDate];
    const insert = "INSERT INTO estoque(nomereme, ultTomado, intervalo, toma_quantos, qtdPossui, qtdMin, dataPedido) VALUES (?,?,?,?,?,?,?)";

    connection.query(insert, values, function (err, result) {
        if (!err) {
            console.log("Dados inseridos com sucesso!");

            // Exibir a data calculada para pedir uma nova receita no terminal
            console.log(`Data para pedir nova receita: ${formattedNextRequestDate}`);

            // Enviar resposta para o cliente
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Lembrete de Medicamentos</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="/index.js" defer></script>
                    <script src="script.js" defer></script>
                </head>
                <body>
                    <header>
                        <h1>Lembrete de Medicamentos</h1>
                    </header>
                    <article class="table-responsive">
                        <table class="table table.bg-primary">
                            <tr>
                                <th class="table-primary">Medicamento</th>
                                <th class="table-primary">Hora do último</th>
                                <th class="table-primary">Intervalo de...horas</th>
                                <th class="table-primary">Quantidade</th>
                                <th class="table-primary">Editar</th>
                                <th class="table-primary">Deletar</th>
                            </tr>
                            ${rows.map(row => `
                                <tr>
                                    <td>${row.nomeMed}</td>
                                    <td>${formatarHora(row.horaTomou)}</td>
                                    <td>${row.horaTomara}</td>
                                    <td>${row.fazUso_qtd}</td>
                                    <td><a href="/atualizar-medicamento-form/${row.id_medicamento}">Editar</a></td>
                                    <td><a href="/deletar-medicamento/${row.id_medicamento}">Deletar</a></td>
                                </tr>
                            `).join('')}
                        </table>
                    </article>
                    <footer>
                        <a href="http://localhost:8081">Voltar</a>
                    </footer>
                    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
                </body>
                </html>
            `);
        } else {
            console.log("Não foi possível inserir os dados ", err);
            res.status(500).send("Erro ao inserir os dados!");
        }
    });
});

// Endpoint para atualizar medicamentos no estoque
app.post('/atualizarEstoque/:id_estoque', (req, res) => {
    const id_estoque = req.params.id_estoque;
    const { nomereme, ultTomado, intervalo, toma_quantos, qtdPossui, qtdMin } = req.body;

    // Convertendo ultTomado em um objeto Date
    const [hh, mm] = ultTomado.split(':');
    const lastTaken = new Date();
    lastTaken.setHours(hh);
    lastTaken.setMinutes(mm);

    // Convertendo intervalo para número inteiro
    const interval = parseInt(intervalo);

    // Calculando a próxima data para pedir uma nova receita
    const currentDate = new Date();
    const daysToAdd = Math.ceil(qtdPossui / (toma_quantos * interval)); // Quantidade de dias até que a quantidade mínima seja atingida
    const nextRequestDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000); // Adicionando dias em milissegundos

    // Formatando a data do próximo pedido para "YYYY-MM-DD"
    const formattedNextRequestDate = `${nextRequestDate.getFullYear()}-${(nextRequestDate.getMonth() + 1).toString().padStart(2, '0')}-${nextRequestDate.getDate().toString().padStart(2, '0')}`;

    // Atualizar no banco de dados
    const updateQuery = "UPDATE estoque SET nomereme=?, ultTomado=?, intervalo=?, toma_quantos=?, qtdPossui=?, qtdMin=?, dataPedido=? WHERE id_estoque=?";

    const values = [nomereme, ultTomado, intervalo, toma_quantos, qtdPossui, qtdMin, formattedNextRequestDate, id_estoque];

    connection.query(updateQuery, values, function (err, result) {
        if (!err) {
            console.log("Dados atualizados.");

            // Exibir a data calculada para pedir uma nova receita no terminal
            console.log(`Nova data para pedir nova receita: ${formattedNextRequestDate}`);

            // Redirecionar para a lista de estoque
            res.redirect('/listarestoque');
        } else {
            console.log("Erro ao atualizar dados", err);
            res.status(500).send("Erro ao atualizar dados!");
        }
    });
});


// Rota para listar os dados do BD
app.get("/listarestoque", function (req, res) {
    const selectAll = "SELECT * FROM estoque";

    connection.query(selectAll, function (err, rows) {
        if (!err) {
            console.log(rows);
            res.send(`
                   <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Lista de Estoque</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="/index.js" defer></script>
                    <script src="script.js" defer></script>
                </head>
                <body>
                    <header>
                        <h1>Lista  de Estoque </h1>
                    </header>
                    <article class="table-responsive">
                        <table class="table table.bg-primary">
                          <tr>
                              <th class="table-primary">Medicamento</th>
                              <th class="table-primary">Hora do último</th>
                              <th class="table-primary">Intervalo de horas</th>
                              <th class="table-primary">Quantidade por vez</th>
                              <th class="table-primary">Quantidade que possui</th>
                              <th class="table-primary">Quantidade mínima</th>
                              <th class="table-primary">Dia para fazer o pedido</th>
                              <th class="table-primary">Editar</th>
                              <th class="table-primary">Deletar</th>
                          </tr>
                          ${rows.map(row => `
                          <tr>
                              <td>${row.nomereme}</td>
                              <td>${formatarHora(row.ultTomado)}</td>
                              <td>${row.intervalo}</td>
                              <td>${row.toma_quantos}</td>
                              <td>${row.qtdPossui}</td>
                              <td>${row.qtdMin}</td>
                              <td>${formatarDataPedido(row.dataPedido)}</td>
                              <td><a href="/atualizar-estoque-form/${row.id_estoque}">Editar</a></td>
                              <td><a href="/deletar-estoque/${row.id_estoque}">Deletar</a></td>
                          </tr>
                          `).join('')}
                      </table>
                  </article>
                  <footer>
                      <a href="http://localhost:8081/estoqueremedio">Voltar</a>
                  </footer>
                    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>

              </body>
              </html>
            `);
        } else {
            console.log("Erro ao carregar lista do estoque! ", err);
            res.status(500).send("Erro ao listar o estoque!");
        }
    });
});
// Função para formatar a hora no formato HH:MM a partir de uma string "HH:MM:SS"
function formatarHora(horaString) {
    if (!horaString || typeof horaString !== 'string') return ''; // Retorna uma string vazia se horaString for falsy ou não for uma string

    const partes = horaString.split(':');
    if (partes.length < 2) return ''; // Retorna uma string vazia se não houver pelo menos duas partes separadas por ':'

    const [horas, minutos] = partes.slice(0, 2); // Pegar apenas as duas primeiras partes (horas e minutos)
    return `${horas}:${minutos}`;
}

// Função para formatar a data do próximo pedido no formato DD.MM.AA a partir de uma string "YYYY-MM-DDTHH:MM:SS.000Z"
function formatarDataPedido(data) {
    if (!data) return ''; // Retorna uma string vazia se data for falsy

    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return ''; // Retorna uma string vazia se dataObj não for uma data válida

    const dia = dataObj.getDate().toString().padStart(2, '0');
    const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
    const ano = dataObj.getFullYear().toString().slice(-2); // Obtém os dois últimos dígitos do ano
    return `${dia}.${mes}.${ano}`;
}



// Rota para deletar os dados do estoque
app.get("/deletar-estoque/:id_estoque", function (req, res) {
    const id_estoque = req.params.id_estoque;

    const deleteEstoque = "DELETE FROM estoque WHERE id_estoque = ?";

    connection.query(deleteEstoque, [id_estoque], function (err, result) {
        if (!err) {
            console.log("Estoque deletado!");
            res.redirect('/listarestoque');
        } else {
            console.log("Erro ao deletar o estoque!", err);
            res.status(500).send("Erro ao deletar o estoque!");
        }
    });
});

// Rota para atualizar os dados do estoque
app.get("/atualizar-estoque-form/:id_estoque", function (req, res) {
    const id_estoque = req.params.id_estoque;

    const selectestoque = "SELECT * FROM estoque WHERE id_estoque=?";

    connection.query(selectestoque, [id_estoque], function (err, result) {
        if (!err && result.length > 0) {
            const estoque = result[0];

            res.send(`
           <!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atualizar Estoque</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kufam:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="icon" type="image/x-icon" href="icon.png">
    <link rel="stylesheet" type="text/css" href="/estilo.css">
    <script src="index.js" defer></script>
    <script src="/script.js" defer></script>
</head>

<body>
    <header>
        <h1>Atualizar Estoque</h1>
    </header>
    <article>
                    <form class="cadastro" action="/atualizar-estoque/${id_estoque}" method="POST">
            

                        <div class="field inputbox">
                            <label for="nomereme"></label>
                            <input type="text" id="nomereme" name="nomereme"  value="${estoque.nomereme}" required>
                            <span>Nome do medicamento:</span>
                        </div>

                        <div>
                            <label for="ultTomado">Que horas você tomou sua última medicação?(HH:MM):</label>
                            <input type="time" id="ultTomado" name="ultTomado" class="custom-time-input" value="${estoque.ultTomado}" required>
                        </div>

                        <div class="field inputbox">

                            <label for="intervalo">A cada quantas horas deve tomar novamente?</label>
                                <select name="intervalo" id="intervalo" value="${estoque.intervalo}" required>
                                    <option value="">Selecione</option>
                                    <option value="4">4hs</option>
                                    <option value="6">6hs</option>
                                    <option value="8">8hs</option>
                                    <option value="12">12h</option>
                                </select>
                            </div>

                            <div class="field inputbox">
                                <label for="toma_quantos">Quantidade de medicamentos que toma por vez:</label>
                                <input type="number" id="toma_quantos" name="toma_quantos" value="${estoque.toma_quantos}" required>
                            </div>

                        
                            <div class="field inputbox">
                                <label for="qtdPossui">Quantidade de medicamentos que possui ao todo:</label>
                                <input type="number" id="qtdPossui" name="qtdPossui" value="${estoque.qtdPossui}" required>
                            </div>

                            <div class="field inputbox">
                                <label for="qtdMin">Quantidade mínima de medicamneto: (Ex:a quantidade mínima será 10, então quando tive 10 unidades você será informado.)</label>
                                <input type="number" id="qtdMin" name="qtdMin" value="${estoque.qtdMin}" required>
                            </div>

                        
                         <input type="submit" value="Adicionar">
                    </form>
                </article>

                <footer id="footer">
                    <a href="http://localhost:8081">Voltar</a>
                </footer>
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>

                </body>
                </html>
            `);
        } else {
            console.log("Erro ao obter dados do estoque! ", err);
            res.status(500).send("Erro ao obter dados do estoque!");
        }
    });
});

// Rota para receber os dados atualizados do estoque
app.post('/atualizar-estoque/:id_estoque', (req, res) => {
    const id_estoque = req.params.id_estoque;
    const nomereme = req.body.nomereme;
    const ultTomado = req.body.ultTomado;
    const intervalo = req.body.intervalo;
    const toma_quantos = req.body.toma_quantos;
    const qtdPossui = req.body.qtdPossui;
    const qtdMin = req.body.qtdMin;

    // Convertendo ultTomado em um objeto Date
    const [hh, mm] = ultTomado.split(':');
    const lastTaken = new Date();
    lastTaken.setHours(hh);
    lastTaken.setMinutes(mm);

    // Convertendo intervalo para número inteiro
    const interval = parseInt(intervalo);

    // Calculando a data para novo pedido
    const dataPedido = calcularDataPedido(interval, qtdPossui, toma_quantos, qtdMin, lastTaken);

    // Atualizar no banco de dados
    const updateQuery = "UPDATE estoque SET nomereme=?, ultTomado=?, intervalo=?, toma_quantos=?, qtdPossui=?, qtdMin=?, dataPedido=? WHERE id_estoque=?";

    connection.query(updateQuery, [nomereme, ultTomado, intervalo, toma_quantos, qtdPossui, qtdMin, dataPedido, id_estoque], function (err, result) {
        if (!err) {
            console.log("Dados atualizados.");
            res.redirect('/listarestoque');
        } else {
            console.log("Erro ao atualizar dados", err);
            res.status(500).send("Erro ao atualizar dados!");
        }
    });
});


/*-------------------Final curd estoque*-------------------*/


/*Inicio crud criar conta*/
app.get("/criarconta", function (req, res) {
    res.sendFile(__dirname + "/criarconta.html")
})

app.post('/adicionarUsuario', (req, res) => {
    const { usuario, senha } = req.body;
    const query = 'INSERT INTO criarConta (usuario, senha) VALUES (?, ?)';
    connection.query(query, [usuario, senha], (err, result) => {
        if (err) {
            console.error('Não foi possível criar a conta!', err);
            res.status(500).send('Erro!');
        } else {
            console.log('Conta criada!');
              res.send(`
                    <!DOCTYPE html>
                    <html lang="pt-br">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Erro!</title>
                        <link rel="icon" type="image/x-icon" href="icon.png">
                        <link rel="stylesheet" type="text/css" href="/estilo.css">
                        <script src="index.js" defer></script>
                    </head>
                    <body class="telaInicio">
                    <head><h1 id="feedback">Conta criada!</h1></head>
                     <div class="botoes"> 
                        <a href="http://localhost:8081/login" class="btn"> Entrar</a></div>
                    
                        <footer id="footer">
                            <a href="http://localhost:8081/login">Voltar</a>
                        </footer>
                    </body>
                    </html>
                `);            }
    });
});

// Rota para listar os dados do BD
app.get("/listarusuarios", function (req, res) {
    const selectAll = "SELECT * FROM criarConta";

    connection.query(selectAll, function (err, rows) {
        if (!err) {
            res.send(`
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Lista de Usuários</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body>
                    <p>Lista de Usuários</p>
                    <div id="page-container">
                        <div id="content-wrap">
                            <table>
                                <tr>
                                    <th>Usuário</th>
                                    <th>Senha</th>
                                    <th>Editar</th>
                                    <th>Deletar</th>
                                </tr>
                                ${rows.map(row => `
                                <tr>
                                    <td>${row.usuario}</td>
                                    <td>${row.senha}</td>
                                    <td><a href="/atualizar-form/${row.id_usuario}">Editar</a></td>
                                    <td><a href="/deletar/${row.id_usuario}">Deletar</a></td>
                                </tr>
                                `).join('')}
                            </table>
                        </div>
                        <footer>
                            <a href="http://localhost:8081">Voltar</a>
                        </footer>
                    
                                        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>

                </body>
                </html>
            `);
        } else {
            console.log("Erro ao carregar lista de usuários! ", err);
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erro!</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body class="telaInicio">
   
                    <div class="imagem_fundo"></div>
                    footer id="footer">
                        <a href="http://localhost:8081">Voltar</a>
                    </footer>
                </body>
                </html>
            `);
        }
    });
});


// Rota para deletar os dados
app.get("/deletar/:id_usuario", function (req, res) {
    const id_usuario = req.params.id_usuario;

    const deleteusuario = "DELETE FROM criarConta WHERE id_usuario = ?";

    connection.query(deleteusuario, [id_usuario], function (err, result) {
        if (!err) {
            console.log("Usuário deletado!");
            res.redirect('/listarusuarios');
        } else {
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erro!</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body class="telaInicio">
   
                    <div class="imagem_fundo"></div>
                    <footer id="footer">
                        <a href="http://localhost:8081">Voltar</a>
                    </footer>
                </body>
                </html>
            `);
        }
    });
});


// Rota para atualizar os dados
app.get("/atualizar-form/:id_usuario", function (req, res) {
    const id_usuario = req.params.id_usuario;

    const selectcriarConta = "SELECT * FROM criarConta WHERE id_usuario=?";

    connection.query(selectcriarConta, [id_usuario], function (err, result) {
        if (!err && result.length > 0) {
            const criarConta = result[0];

            res.send(`

            <!DOCTYPE html>
            <html lang="pt-br">
            
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Criar Conta</title>
                <link rel="icon" type="image/x-icon" href="icon.png">
                <link rel="stylesheet" type="text/css" href="/estilo.css">
                <script src="index.js" defer></script>
            </head>
            
            <body>
                <article>
                    <h1>Criar sua Conta</h1>
                    <form class="cadastro" action="/atualizar-form/${id_usuario}" method="POST">
                        <div class="field">
                            <label for="usuario">Crie seu usuário:</label>
                            <input type="text" id="usuario" name="usuario" value="${criarConta.usuario}" required>
                        </div>
                        <div class="field">
                            <label for="senha">Crie sua senha:</label>
                            <input type="password" id="senha" name="senha" value="${criarConta.senha}" required>
                        </div>          
                        <input type="submit" value="Atualizar">
                    </form>
                </article>
                <footer id="footer">
                        <a href="http://localhost:8081">Voltar</a>
                </footer>
                </body>
            </html>
            `);
        } else {
            console.log("Erro ao obter do usuário! ", err);
            res.send(`
                <!DOCTYPE html>
                <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erro!</title>
                    <link rel="icon" type="image/x-icon" href="icon.png">
                    <link rel="stylesheet" type="text/css" href="/estilo.css">
                    <script src="index.js" defer></script>
                </head>
                <body class="telaInicio">
   
                    <div class="imagem_fundo"></div>
                    <footer id="footer">
                        <a href="http://localhost:8081">Voltar</a>
                    </footer>
                </body>
                </html>
            `);
        }
    })
})

app.post('/atualizar-form/:id_usuario', (req, res) => {
    const id_usuario = req.params.id_usuario;
    const usuario = req.body.usuario;
    const senha = req.body.senha;

    const updateQuery = "UPDATE criarConta SET usuario =?, senha =?  WHERE id_usuario =?";

    connection.query(updateQuery, [usuario, senha, id_usuario], function (err, result) {
        if (!err) {
            console.log("Dados atualizados.")
            res.send("Dados atualizados.")
        } else {
            console.log("Erro ao atualizar dados", err);
        }
    });
});


/*---------------------------------final crud criar conta -----------------------------*/


/*inicio login */

// Rota para exibir a página de login
app.get("/login", function (req, res) {
    res.sendFile(__dirname + "/login.html");
});


// Rota para processar o login
app.post("/login", function (req, res) {
    const { usuario, senha } = req.body;

    const query = "SELECT * FROM criarConta WHERE usuario = ? AND senha = ?";
    connection.query(query, [usuario, senha], function (err, results) {
        if (err) {
            console.log("Erro no login:", err);
            res.status(500).send("Erro no servidor");
        } else {
            if (results.length > 0) {
                req.session.loggedin = true;
                req.session.usuario = usuario;
                res.redirect("/medicamentos"); // Redireciona após o login
            } else {
                res.send(`
                    <!DOCTYPE html>
                    <html lang="pt-br">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Erro!</title>
                        <link rel="icon" type="image/x-icon" href="icon.png">
                        <link rel="stylesheet" type="text/css" href="/estilo.css">
                        <script src="index.js" defer></script>
                    </head>
                    <body class="telaInicio">
                    <head><h1 id="feedback">Usuário ou senha incorretos!</h1></head>
                    
                        <footer id="footer">
                            <a href="http://localhost:8081/login">Voltar</a>
                        </footer>
                    </body>
                    </html>
                `);        }
        }
    });
});


app.listen(8081, function () {
    console.log("Servidor rodando na url http://localhost:8081");
});

