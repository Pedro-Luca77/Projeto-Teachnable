# 💧 HydraSense IA - Análise Inteligente de Turbidez da Água

**HydraSense IA** é uma aplicação web completa e moderna para **classificação de turbidez da água** e avaliação de potabilidade em tempo real, integrando **Visão Computacional** com [Teachable Machine (Google)](https://teachablemachine.withgoogle.com/) e **Inteligência Artificial Generativa Especialista** com a [API do Google Gemini](https://ai.google.dev/).

---

## 🌟 Principais Recursos

- 🔬 **Classificação por Visão Computacional (Teachable Machine)**:
  - Carregamento automático do modelo oficial: `https://teachablemachine.withgoogle.com/models/bwPyRB7c2/`
  - Predição em tempo real das 3 classes:
    - 🟢 **Água Limpa** (`< 5 NTU`) - Status Verde
    - 🟡 **Turbidez Média (Turva)** (`5 - 50 NTU`) - Status Amarelo
    - 🔴 **Alta Turbidez (Muito Turva)** (`> 50 NTU`) - Status Vermelho
  - Barras de progresso com porcentagens em tempo real, cálculo de latência e contagem de amostras analisadas.

- 📷 **Múltiplos Métodos de Entrada de Mídia**:
  - **Webcam ao Vivo**: controle de iniciar/parar câmera, alternar câmera frontal/traseira (mobile), congelar frame (`Capturar Amostra`) e modo contínuo em tempo real.
  - **Upload de Fotos**: suporte a arrastar e soltar (drag & drop), seleção de arquivos locais (JPG, PNG, WEBP) e **colar diretamente da área de transferência (`Ctrl+V`)**.
  - **Amostras Sintéticas Prontas**: gere padrões de água límpida, turbidez média e alta turbidez com um clique para testar a aplicação sem precisar de câmera.

- 🧠 **Diagnóstico Especialista Estruturado (Google Gemini IA)**:
  - Botão em destaque: **"🔬 Gerar Diagnóstico com Gemini IA"**
  - Prompt técnico estruturado contendo as probabilidades exatas do Teachable Machine e a imagem da amostra.
  - Relatório estruturado em **4 tópicos obrigatórios**:
    1. **Potabilidade e Avaliação Geral** (referenciando normas sanitárias como a Portaria GM/MS nº 888 e OMS).
    2. **Riscos à Saúde e Principais Contaminantes Físicos/Biológicos** (Giardia, Cryptosporidium, coliformes, sedimentos e metais).
    3. **Métodos Recomendados de Filtragem/Purificação** (decantação, coagulação, filtração por carvão/areia e desinfecção por fervura/cloração).
    4. **Usos Permitidos e Recomendações** (consumo, animais, horta, limpeza ou descarte).
  - Opções para copiar o laudo completo com um clique.

- 💬 **Chatbot Assistente Hidrológico Integrado**:
  - Caixa de chat interativa abaixo do laudo para tirar dúvidas de acompanhamento em tempo real (ex: *"Posso ferver essa água para beber?"*, *"Como dosar hipoclorito de sódio?"*).
  - Histórico de conversa contextualizado com os dados da amostra atual.
  - Botões rápidos com perguntas frequentes (chips).

- 🎨 **Design & Interface Moderna**:
  - Tema ecológico aquático (*Cyber Aqua & Oceanic Glassmorphism*) com tons de azul profundo, ciano elétrico e esmeralda.
  - Layout totalmente responsivo para desktop, tablets e smartphones.
  - Modal discreto para inserção da chave `GEMINI_API_KEY` com teste de conexão e armazenamento seguro no `localStorage`.

---

## 🚀 Como Executar o Projeto

Como a aplicação é construída com tecnologias web puras (HTML5, CSS3 e JavaScript Vanilla), ela pode ser aberta de duas maneiras:

### Opção 1: Abrir diretamente no Navegador
1. Dê um duplo clique no arquivo [`index.html`](file:///c:/Users/Home/Documents/Projeto_Teachnable/index.html) para abrir em qualquer navegador moderno (Google Chrome, Microsoft Edge, Mozilla Firefox, Opera).
2. *Nota:* Para o modo de **Upload de Imagem** e **Amostras Prontas**, o modo direto via arquivo funciona 100%. Para acesso à **Webcam**, alguns navegadores exigem que a página seja servida em `localhost` por questões de segurança de hardware.

### Opção 2: Servidor Local (Recomendado para Webcam)
Abra o terminal (PowerShell ou Prompt de Comando) na pasta do projeto e execute:

```bash
# Com Python (já instalado no sistema):
python -m http.server 8080
```

Em seguida, abra seu navegador no endereço:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🔑 Como Obter e Configurar a Chave do Gemini

1. Acesse o **[Google AI Studio](https://aistudio.google.com/app/apikey)** e faça login com sua conta Google.
2. Clique em **"Create API Key"** (o uso inicial é gratuito com cotas generosas).
3. Na aplicação **HydraSense IA**, clique no botão **"Chave Gemini"** no topo da tela.
4. Cole sua chave no campo `GEMINI_API_KEY`, clique em **"Testar Conexão"** para validar e depois em **"Salvar Chave"**.
5. A chave fica salva no `localStorage` do seu navegador para acessos futuros.

---

## 📁 Estrutura de Arquivos

```
Projeto_Teachnable/
├── index.html        # Estrutura HTML5 semântica, viewport, modais e CDNs
├── style.css         # Design system, glassmorphism, temas e responsividade
├── script.js         # Lógica do Teachable Machine, MediaStream, Gemini API e Chatbot
└── README.md         # Documentação completa do projeto
```

---

## 🛡️ Aviso Legal e Científico
*O HydraSense IA é uma ferramenta voltada para fins educativos, triagem preliminar e conscientização ambiental. A avaliação visual e por IA não substitui análises físico-químicas e microbiológicas completas em laboratório credenciado.*
