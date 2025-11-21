🌦️ dashboard-climatico-brasil
Base de Conhecimento Climático criada para a Imersão Dev (Alura/Google). Dashboard que transforma dados em alertas de perigo e previsões, com um Boletim Nacional dinâmico. Construído com HTML, CSS e JavaScript puro.

(Sugestão: tire um print da tela principal do seu projeto, hospede em um site como o Imgur e cole o link aqui)

📜 Sobre o Projeto
O TempoAgora foi desenvolvido como o projeto final da Imersão Dev com Alura e Google. O objetivo principal foi criar mais do que um simples painel de previsão do tempo; a meta era construir uma Base de Conhecimento Climático dinâmica e inteligente.

A aplicação coleta dados brutos de APIs meteorológicas e os transforma em informações úteis e acionáveis para o usuário, como previsões detalhadas, um mapa de chuvas interativo e, o mais importante, um Boletim Nacional que analisa e resume as condições climáticas do Brasil, emitindo alertas de perigo com base em dados em tempo real.

Este projeto demonstra a aplicação prática de tecnologias web front-end para resolver um problema real, com foco na utilidade, criatividade e apresentação visual.

✨ Funcionalidades Principais
Dashboard Dinâmico: Cards de clima que exibem temperatura, sensação térmica, umidade e vento para capitais e polos agrícolas do Brasil.
Boletim Nacional Inteligente: Um resumo gerado dinamicamente que analisa o clima por região, destacando alertas de perigo (Amarelo, Laranja, Vermelho) com base em dados de tempo severo.
Mapa Interativo: Integração com o Windy.com para visualização de radar de chuvas e outras camadas climáticas em tempo real.
Busca por Geolocalização: Permite ao usuário buscar qualquer cidade do mundo e obter a previsão do tempo atual para ela.
Sistema de Favoritos: Usuários podem "pinar" cidades de interesse para acesso rápido através de um filtro dedicado, com os dados salvos no localStorage.
Carrossel de Serviços de Emergência: Acesso rápido aos números da Defesa Civil, Bombeiros, SAMU, etc.
Botão de Pânico (SOS): Uma funcionalidade de segurança que permite ao usuário compartilhar sua geolocalização via WhatsApp com um contato de emergência.
Design Responsivo e Moderno: Interface com efeito glassmorphism, totalmente adaptável para desktops, tablets e celulares.
🛠️ Tecnologias Utilizadas
Este projeto foi construído do zero utilizando apenas as tecnologias fundamentais do desenvolvimento web, sem o uso de frameworks complexos.

HTML5: Estruturação semântica do conteúdo.
CSS3: Estilização avançada, animações e layout responsivo (com classes do Tailwind CSS para agilidade).
JavaScript (ES6+): O cérebro do projeto, responsável por:
Consumo de APIs com fetch e async/await.
Manipulação dinâmica do DOM.
Gerenciamento de eventos e interatividade.
Lógica de negócio para a criação da base de conhecimento.
Serviços e Bibliotecas Externas
API Open-Meteo: Fornecimento dos dados de previsão do tempo.
Windy.com: Embed do mapa interativo de clima.
Font Awesome: Biblioteca de ícones.
Google Fonts: Para a tipografia do projeto.
🚀 Como Executar o Projeto
Como este é um projeto puramente front-end, não há necessidade de um servidor ou de processos de build complexos.

Clone o repositório:
bash
git clone https://github.com/seu-usuario/dashboard-climatico-brasil.git
Navegue até a pasta do projeto:
bash
cd dashboard-climatico-brasil
Abra o arquivo index.html no seu navegador:
Você pode simplesmente dar um duplo clique no arquivo index.html na sua pasta.
Ou, para uma melhor experiência (evitando problemas com CORS, se aplicável no futuro), use uma extensão como o Live Server no VS Code.
📂 Estrutura do Projeto
A estrutura de arquivos foi mantida simples para refletir o escopo da imersão:

plaintext
/
├── 📄 index.html      # Arquivo principal com a estrutura da página
├── 🎨 style.css       # Folha de estilos para toda a aplicação
├── 🧠 script.js       # Contém toda a lógica JavaScript do projeto
└── 📦 data.json       # Armazena a lista de cidades e serviços de emergência


🤝 Contato
Valter Moraes

E-mail: moraesvalter26@gmail.com
WhatsApp: +55 47 8928-4337
